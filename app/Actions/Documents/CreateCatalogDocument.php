<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Data\CatalogDocumentData;
use App\Events\DashboardUpdated;
use App\Models\CatalogDocument;
use App\Support\DocumentCatalog;
use Illuminate\Support\Str;

/**
 * Ajoute une pièce au catalogue, en fin de sa catégorie, avec une clé
 * stable dérivée du libellé.
 */
final class CreateCatalogDocument
{
    public function handle(CatalogDocumentData $data): CatalogDocument
    {
        $document = CatalogDocument::query()->create([
            ...$data->toArray(),
            'key' => self::uniqueKey($data->label),
            'position' => (int) CatalogDocument::query()->where('category', $data->category->value)->max('position') + 1,
        ]);

        DocumentCatalog::flush();

        event(new DashboardUpdated('catalog', ['id' => $document->id], "a ajouté la pièce « {$document->label} » au catalogue"));

        return $document;
    }

    /**
     * Clé en snake_case dérivée du libellé, suffixée si elle existe déjà.
     */
    public static function uniqueKey(string $label): string
    {
        $base = Str::slug($label, '_');
        $base = $base === '' ? 'piece' : $base;
        $key = $base;
        $suffix = 2;

        while (CatalogDocument::query()->where('key', $key)->exists()) {
            $key = "{$base}_{$suffix}";
            $suffix++;
        }

        return $key;
    }
}
