<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Data\CatalogDocumentData;
use App\Events\DashboardUpdated;
use App\Models\CatalogDocument;
use App\Support\DocumentCatalog;

/**
 * Modifie une pièce du catalogue. La clé ne change jamais : les listes
 * existantes la référencent. Un changement de catégorie la place en fin
 * de la nouvelle catégorie.
 */
final class UpdateCatalogDocument
{
    public function handle(CatalogDocument $document, CatalogDocumentData $data): CatalogDocument
    {
        $attributes = $data->toArray();

        if ($document->category !== $data->category) {
            $attributes['position'] = (int) CatalogDocument::query()->where('category', $data->category->value)->max('position') + 1;
        }

        $document->fill($attributes)->save();

        DocumentCatalog::flush();

        event(new DashboardUpdated('catalog', ['id' => $document->id], "a modifié la pièce « {$document->label} » du catalogue"));

        return $document;
    }
}
