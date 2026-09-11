<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Import d'agences collées depuis un tableur : seul le nom est obligatoire.
 */
class ImportAgenciesRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rows' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*.name' => ['required', 'string', 'max:255'],
            'rows.*.email' => ['nullable', 'email', 'max:255'],
            'rows.*.phone' => ['nullable', 'string', 'max:40'],
            'rows.*.city' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'rows' => 'agences',
            'rows.*.name' => 'nom de l’agence',
            'rows.*.email' => 'e-mail',
            'rows.*.phone' => 'téléphone',
            'rows.*.city' => 'ville',
        ];
    }
}
