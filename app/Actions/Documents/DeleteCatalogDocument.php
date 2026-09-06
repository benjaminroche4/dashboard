<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Models\CatalogDocument;
use App\Support\DocumentCatalog;

/**
 * Retire une pièce du catalogue. Les listes déjà générées qui la citaient
 * affichent alors sa clé brute : à réserver aux pièces inutilisées.
 */
final class DeleteCatalogDocument
{
    public function handle(CatalogDocument $document): void
    {
        $label = $document->label;
        $id = $document->id;

        $document->delete();

        DocumentCatalog::flush();

        event(new DashboardUpdated('catalog', ['id' => $id, 'deleted' => true], "a retiré la pièce « {$label} » du catalogue"));
    }
}
