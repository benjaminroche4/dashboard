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
        $uploads = DB::transaction(fn (): Collection => collect($files)->map(function (UploadedFile $file) use ($request, $personIndex, $documentKey): DocumentUpload {
            $path = $file->store("document-uploads/{$request->uuid}/{$personIndex}/{$documentKey}", DocumentUpload::DISK);

            return $request->uploads()->create([
                'person_index' => $personIndex,
                'document_key' => $documentKey,
                'original_name' => $file->getClientOriginalName(),
                'path' => (string) $path,
                'mime_type' => $file->getClientMimeType(),
                'size' => (int) $file->getSize(),
            ]);
        }));

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
