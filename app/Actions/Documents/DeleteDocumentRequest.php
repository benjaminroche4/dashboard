<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;

/**
 * Supprime définitivement une liste de pièces.
 */
final class DeleteDocumentRequest
{
    public function handle(DocumentRequest $request): void
    {
        $name = $request->fullName();
        $id = $request->id;

        $request->delete();

        event(new DashboardUpdated('documents', ['id' => $id, 'deleted' => true], "a supprimé la liste de pièces de {$name}"));
    }
}
