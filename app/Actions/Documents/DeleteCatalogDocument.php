<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Models\CatalogDocument;
use App\Models\DocumentRequest;
use App\Support\DocumentCatalog;
use Illuminate\Validation\ValidationException;

/**
 * Retire une pièce du catalogue, à condition qu'aucune liste de documents
 * ne la cite encore (sinon le PDF afficherait sa clé brute).
 */
final class DeleteCatalogDocument
{
    /**
     * @throws ValidationException si une liste de documents cite encore cette pièce.
     */
    public function handle(CatalogDocument $document): void
    {
        $label = $document->label;
        $id = $document->id;

        $referenced = DocumentRequest::query()->where('persons', 'like', '%"'.$document->key.'"%')->count();

        if ($referenced > 0) {
            throw ValidationException::withMessages(['document' => __('Cette pièce est encore citée par :count liste(s) de documents : retirez-la de ces listes avant de la supprimer.', ['count' => $referenced])]);
        }

        $document->delete();

        DocumentCatalog::flush();

        event(new DashboardUpdated('catalog', ['id' => $id, 'deleted' => true], "a retiré la pièce « {$label} » du catalogue"));
    }
}
