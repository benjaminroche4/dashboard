<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DocumentCategory;
use Carbon\CarbonInterface;
use Database\Factories\CatalogDocumentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Pièce du catalogue administrable : clé stable, catégorie, libellé et aide
 * en français, traductions anglaises facultatives, ordre dans sa catégorie.
 *
 * @property int $id
 * @property string $uuid
 * @property string $key
 * @property DocumentCategory $category
 * @property string $label
 * @property string|null $label_en
 * @property string|null $hint
 * @property string|null $hint_en
 * @property int $position
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 */
#[Fillable(['key', 'category', 'label', 'label_en', 'hint', 'hint_en', 'position'])]
class CatalogDocument extends Model
{
    /** @use HasFactory<CatalogDocumentFactory> */
    use HasFactory;

    use HasUuids;

    /**
     * L'UUID est l'identifiant public (URL) ; l'identifiant numérique reste la clé primaire.
     *
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => DocumentCategory::class,
            'position' => 'integer',
        ];
    }
}
