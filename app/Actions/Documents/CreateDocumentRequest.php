<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Data\DocumentRequestData;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\User;

/**
 * Enregistre une demande de pièces prête à être téléchargée en PDF ou
 * envoyée au client.
 */
final class CreateDocumentRequest
{
    public function handle(DocumentRequestData $data, ?User $by = null): DocumentRequest
    {
        $request = DocumentRequest::query()->create([
            ...$data->toArray(),
            'created_by' => $by?->id,
        ]);

        event(new DashboardUpdated('documents', ['id' => $request->id], 'a préparé une demande de pièces pour '.$request->fullName()));

        return $request;
    }
}
