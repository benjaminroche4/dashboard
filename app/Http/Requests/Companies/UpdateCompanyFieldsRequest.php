<?php

declare(strict_types=1);

namespace App\Http\Requests\Companies;

use App\Models\Company;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Modification en place d'un ou plusieurs champs d'une entreprise depuis sa
 * fiche (29 octobre 2026, comme les fiches agent, agence et partenaire) :
 * seuls les champs envoyés sont validés et écrits.
 */
class UpdateCompanyFieldsRequest extends FormRequest
{
    /** Champs modifiables en place, avec leur nom lisible pour le journal. */
    public const array FIELDS = [
        'phone' => 'le téléphone',
        'email' => 'l’e-mail',
        'website' => 'le site web',
        'street' => 'l’adresse',
        'postal_code' => 'l’adresse',
        'city' => 'l’adresse',
        'notes' => 'les notes',
    ];

    public function authorize(): bool
    {
        /** @var Company|null $company */
        $company = $this->route('company');

        return $company !== null && ($this->user()?->can('update', $company) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'website' => ['sometimes', 'nullable', 'url:http,https', 'max:2048'],
            'street' => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return (new StoreCompanyRequest)->attributes();
    }

    /**
     * Les champs envoyés, et eux seuls.
     *
     * @return array<string, mixed>
     */
    public function fields(): array
    {
        return array_intersect_key($this->validated(), self::FIELDS);
    }
}
