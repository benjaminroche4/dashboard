<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Models\DocumentUpload;
use Illuminate\Support\Facades\Storage;

/** Supprime une pièce déposée : le fichier sur le disque privé, puis l'enregistrement. */
final class DeleteDocumentUpload
{
    public function handle(DocumentUpload $upload): void
    {
        $upload->loadMissing('request');
        Storage::disk(DocumentUpload::DISK)->delete($upload->path);
        $upload->delete();

        event(new DashboardUpdated('documents', ['id' => $upload->document_request_id], 'a supprimé la pièce déposée « '.$upload->original_name.' » de '.$upload->request->fullName()));
    }
}
