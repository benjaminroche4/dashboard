<?php

declare(strict_types=1);

namespace App\Http\Requests\Owners;

use App\Enums\OwnerKind;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Annuaire des propriétaires : recherche, filtres (type, avec ou sans bien),
 * tri, page. Tout est fait par la base : la liste n'est plus chargée en
 * entier ni triée en mémoire.
 */
class IndexOwnersRequest extends FormRequest
{
    /** Lignes par page. */
    public const int PER_PAGE = 50;

    /** Colonnes triables. */
    public const array SORTS = ['name', 'city', 'properties_count', 'last_contacted_at', 'created_at'];

    /** Filtre « détient des biens » : les deux réponses possibles. */
    public const array HOLDINGS = ['with', 'without'];

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'kind' => ['nullable', 'array'],
            'kind.*' => [Rule::enum(OwnerKind::class)],
            'holding' => ['nullable', 'array'],
            'holding.*' => [Rule::in(self::HOLDINGS)],
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
     * Types cochés ; vide = tous.
     *
     * @return list<string>
     */
    public function kinds(): array
    {
        $kinds = $this->validated('kind');

        return is_array($kinds) ? array_values(array_map(strval(...), $kinds)) : [];
    }

    /**
     * « with » et/ou « without » ; les deux cochés reviennent à ne rien filtrer.
     *
     * @return list<string>
     */
    public function holdings(): array
    {
        $holdings = $this->validated('holding');

        return is_array($holdings) ? array_values(array_map(strval(...), $holdings)) : [];
    }

    public function sort(): string
    {
        $sort = $this->validated('sort');

        return is_string($sort) ? $sort : 'name';
    }

    /**
     * @return 'asc'|'desc'
     */
    public function direction(): string
    {
        return $this->validated('dir') === 'desc' ? 'desc' : 'asc';
    }

    /**
     * @return array<string, string|list<string>>
     */
    public function filters(): array
    {
        return [
            'q' => $this->search(),
            'sort' => $this->sort(),
            'dir' => $this->direction(),
            'kind' => $this->kinds(),
            'holding' => $this->holdings(),
        ];
    }
}
