<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Jobs\AnalyzeDocumentUploadJob;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use App\Services\Assistant;
use App\Support\DocumentCatalog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Enregistre les fichiers déposés pour une pièce d'une personne du foyer,
 * sur le disque privé, puis prévient l'équipe. Le dépôt vient du client (page
 * publique, sans acteur) ou d'un membre qui verse une pièce reçue par
 * ailleurs — e-mail, WhatsApp, en main propre — depuis le backoffice.
 */
final readonly class StoreDocumentUploads
{
    public function __construct(private Assistant $assistant) {}

    /**
     * @param  list<UploadedFile>  $files
     * @return Collection<int, DocumentUpload>
     */
    public function handle(DocumentRequest $request, int $personIndex, string $documentKey, array $files, ?User $by = null): Collection
    {
        try {
            $uploads = DB::transaction(fn (): Collection => collect($files)->map(function (UploadedFile $file) use ($request, $personIndex, $documentKey): DocumentUpload {
                $path = $file->store("document-uploads/{$request->uuid}/{$personIndex}/{$documentKey}", DocumentUpload::DISK);

                // `store()` répond `false` sans lever quand le disque refuse d'écrire.
                throw_if($path === false, RuntimeException::class, 'Le disque « '.DocumentUpload::DISK." » a refusé le fichier {$file->getClientOriginalName()}.");

                return $request->uploads()->create([
                    'person_index' => $personIndex,
                    'document_key' => $documentKey,
                    'original_name' => $file->getClientOriginalName(),
                    'path' => (string) $path,
                    'mime_type' => $file->getClientMimeType(),
                    'size' => (int) $file->getSize(),
                ]);
            }));
        } catch (Throwable $exception) {
            // Journalisé avec de quoi comprendre depuis Cloud (disque, bucket,
            // fichier), puis remonté en message lisible : le client comme
            // l'équipe voient « pas enregistré », jamais une page d'erreur.
            Log::error('Dépôt de pièce impossible : le stockage a refusé le fichier.', [
                'request' => $request->uuid,
                'person' => $personIndex,
                'document' => $documentKey,
                'disk' => DocumentUpload::DISK,
                'driver' => config('filesystems.disks.'.DocumentUpload::DISK.'.driver'),
                'bucket' => config('filesystems.disks.'.DocumentUpload::DISK.'.bucket'),
                'files' => array_map(fn (UploadedFile $file): string => $file->getClientOriginalName().' ('.$file->getSize().' o)', $files),
                'error' => $exception->getMessage(),
            ]);

            throw new RuntimeException(__('Le fichier n’a pas pu être enregistré. Réessayez dans un instant ; si cela persiste, l’équipe en est informée.'), 0, $exception);
        }

        $person = $request->persons[$personIndex] ?? [];
        $name = trim(($person['first_name'] ?? '').' '.($person['last_name'] ?? '')) ?: $request->fullName();
        $count = $uploads->count();

        $label = DocumentCatalog::label($documentKey);

        // Sans acteur, le dépôt vient du client : c'est lui que le message
        // nomme. Avec un membre, le toast le préfixe de son nom.
        event($by instanceof User
            ? new DashboardUpdated(
                'documents',
                ['id' => $request->id, 'uuid' => $request->uuid, 'uploads' => $count],
                sprintf('a versé %d fichier%s pour « %s » (%s)', $count, $count > 1 ? 's' : '', $label, $name),
                $by,
            )
            : new DashboardUpdated(
                'documents',
                ['id' => $request->id, 'uuid' => $request->uuid, 'uploads' => $count],
                sprintf('%s a déposé %d fichier%s pour « %s »', $name, $count, $count > 1 ? 's' : '', $label),
            ));

        // La lecture IA part tout de suite, en arrière-plan : quand un membre
        // ouvrira la liste, la proposition l'attendra déjà.
        if ($this->assistant->isConfigured()) {
            $uploads->each(fn (DocumentUpload $upload) => dispatch(new AnalyzeDocumentUploadJob($upload))->afterCommit());
        }

        return $uploads;
    }
}
