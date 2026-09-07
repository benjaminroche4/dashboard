<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportAgentsRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rows' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*.first_name' => ['required', 'string', 'max:255'],
            'rows.*.last_name' => ['required', 'string', 'max:255'],
            'rows.*.agency' => ['nullable', 'string', 'max:255'],
            'rows.*.position' => ['nullable', 'string', 'max:255'],
            'rows.*.email' => ['nullable', 'email', 'max:255'],
            'rows.*.phone' => ['nullable', 'string', 'max:40'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'rows' => 'lignes',
            'rows.*.first_name' => 'prénom',
            'rows.*.last_name' => 'nom',
            'rows.*.agency' => 'agence',
            'rows.*.position' => 'fonction',
            'rows.*.email' => 'e-mail',
            'rows.*.phone' => 'téléphone',
        ];
    }
}
