<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAgencyRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'street' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'url:http,https', 'max:2048'],
            'notes' => ['nullable', 'string', 'max:3000'],
            // Prévenir le contact par e-mail qu'il rejoint l'annuaire (décoché par défaut).
            'notify' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nom',
            'street' => 'adresse',
            'postal_code' => 'code postal',
            'city' => 'ville',
            'phone' => 'téléphone',
            'email' => 'e-mail',
            'website' => 'site web',
            'notes' => 'notes',
        ];
    }
}
