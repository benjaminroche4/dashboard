<?php

declare(strict_types=1);

namespace App\Http\Requests\Owners;

use App\Enums\OwnerKind;
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
        // Une société est nommée par sa raison sociale ; un particulier, par son nom.
        $company = $this->input('kind') === OwnerKind::Company->value;

        return [
            'kind' => ['nullable', Rule::enum(OwnerKind::class)],
            'first_name' => [Rule::requiredIf(! $company), 'nullable', 'string', 'max:255'],
            'last_name' => [Rule::requiredIf(! $company), 'nullable', 'string', 'max:255'],
            'company' => [Rule::requiredIf($company), 'nullable', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email', 'max:255'],
            'phone' => ['nullable', 'required_without:email', 'string', 'max:40'],
            'street' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'kind' => 'type de propriétaire',
            'first_name' => 'prénom',
            'last_name' => 'nom',
            'company' => 'raison sociale',
            'email' => 'e-mail',
            'phone' => 'téléphone',
            'street' => 'adresse',
            'postal_code' => 'code postal',
            'city' => 'ville',
            'notes' => 'notes',
        ];
    }
}
