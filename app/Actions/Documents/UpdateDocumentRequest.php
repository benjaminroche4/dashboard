<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Data\DocumentRequestData;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;

/**
 * Met à jour une liste de pièces (personnes, message, lien, langue).
 */
final class UpdateDocumentRequest
{
    public function handle(DocumentRequest $request, DocumentRequestData $data): DocumentRequest
    {
        $request->fill($data->toArray())->save();

        event(new DashboardUpdated('documents', ['id' => $request->id], "a modifié la liste de pièces de {$request->fullName()}"));

        return $request;
    }
}
