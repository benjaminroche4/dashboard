<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use App\Enums\PropertyStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Annuaire des biens paginé côté serveur : recherche, statuts, tri, page.
 * L'annuaire est destiné à compter des milliers de logements.
 */
class IndexPropertiesRequest extends FormRequest
{
    /** Colonnes triables, dans les deux sens. */
    public const array SORTS = ['created_at', 'label', 'rent_cents', 'surface_m2', 'status'];

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            // Plusieurs statuts à la fois, comme le menu « Filtres » de la page.
            'status' => ['nullable', 'array', 'max:10'],
            'status.*' => [Rule::enum(PropertyStatus::class)],
            'sort' => ['nullable', Rule::in(self::SORTS)],
            'dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function search(): string
    {
        return trim((string) $this->validated('q', ''));
    }

    /**
     * @return list<string>
     */
    public function statuses(): array
    {
        /** @var list<string>|null $statuses */
        $statuses = $this->validated('status');

        return $statuses ?? [];
    }

    public function sort(): string
    {
        $sort = $this->validated('sort');

        return is_string($sort) ? $sort : 'created_at';
    }

    /**
     * @return 'asc'|'desc'
     */
    public function direction(): string
    {
        return $this->validated('dir') === 'asc' ? 'asc' : 'desc';
    }
}
