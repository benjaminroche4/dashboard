<?php

declare(strict_types=1);

namespace App\Http\Requests\Owners;

use App\Enums\OwnerStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOwnerRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email', 'max:255'],
            'phone' => ['nullable', 'required_without:email', 'string', 'max:40'],
            'street' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:255'],
            'property_count' => ['nullable', 'integer', 'min:1', 'max:500'],
            'status' => ['nullable', Rule::enum(OwnerStatus::class)],
            'notes' => ['nullable', 'string', 'max:3000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'prénom',
            'last_name' => 'nom',
            'company' => 'société',
            'email' => 'e-mail',
            'phone' => 'téléphone',
            'street' => 'adresse',
            'postal_code' => 'code postal',
            'city' => 'ville',
            'property_count' => 'nombre de biens',
            'status' => 'statut',
            'notes' => 'notes',
        ];
    }
}
