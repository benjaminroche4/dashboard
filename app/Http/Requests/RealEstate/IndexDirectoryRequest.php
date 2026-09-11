<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Liste d'annuaire paginée côté serveur (agents, agences) : recherche, tri,
 * page et filtre « mes favoris ». L'annuaire peut compter des milliers de
 * lignes : rien n'est chargé en entier.
 */
abstract class IndexDirectoryRequest extends FormRequest
{
    /** Lignes par page. */
    public const int PER_PAGE = 50;

    /**
     * Colonnes triables de la liste.
     *
     * @return list<string>
     */
    abstract public function sorts(): array;

    /** Tri appliqué quand la requête n'en demande pas. */
    abstract public function defaultSort(): string;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'favorites' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in($this->sorts())],
            'dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function search(): string
    {
        return trim((string) $this->validated('q', ''));
    }

    /** Ne garder que les favoris du membre connecté. */
    public function favoritesOnly(): bool
    {
        return $this->boolean('favorites');
    }

    public function sort(): string
    {
        $sort = $this->validated('sort');

        return is_string($sort) ? $sort : $this->defaultSort();
    }

    /**
     * @return 'asc'|'desc'
     */
    public function direction(): string
    {
        return $this->validated('dir') === 'desc' ? 'desc' : 'asc';
    }

    /**
     * Filtres tels que le serveur les a compris, pour la prop `filters`.
     *
     * @return array<string, string>
     */
    public function filters(): array
    {
        return [
            'q' => $this->search(),
            'sort' => $this->sort(),
            'dir' => $this->direction(),
            'favorites' => $this->favoritesOnly() ? '1' : '',
        ];
    }
}
