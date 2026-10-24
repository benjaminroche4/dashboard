<?php

declare(strict_types=1);

namespace App\Http\Requests\Search;

use Illuminate\Foundation\Http\FormRequest;

/** Recherche unifiée ⌘K : un texte libre, vide pour « mes dossiers ». */
final class SearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['q' => ['nullable', 'string', 'max:100']];
    }

    public function needle(): string
    {
        return trim((string) $this->validated('q', ''));
    }
}
