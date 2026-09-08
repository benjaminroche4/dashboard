<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Support\DocumentCatalog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Enregistre les fichiers déposés par le client pour une pièce d'une
 * personne du foyer, sur le disque privé, puis prévient l'équipe.
 */
final class StoreDocumentUploads
{
    /**
     * @param  list<UploadedFile>  $files
     * @return Collection<int, DocumentUpload>
     */
    public function handle(DocumentRequest $request, int $personIndex, string $documentKey, array $files): Collection
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

        // Sans acteur : le dépôt vient du client, pas d'un membre de l'équipe.
        event(new DashboardUpdated(
            'documents',
            ['id' => $request->id, 'uuid' => $request->uuid, 'uploads' => $count],
            sprintf('%s a déposé %d fichier%s pour « %s »', $name, $count, $count > 1 ? 's' : '', DocumentCatalog::label($documentKey)),
        ));

        return $uploads;
    }
}
