<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

use App\Enums\AgencySpecialty;
use App\Enums\MandateType;
use App\Enums\SpokenLanguage;
use App\Models\Agency;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Modification en place d'un ou plusieurs champs d'une agence depuis sa fiche
 * (28 octobre 2026, comme la fiche agent) : coordonnées, notes et profil de
 * matching, avec les règles de `StoreAgencyRequest` et `UpdateAgencyProfileRequest`.
 */
class UpdateAgencyFieldsRequest extends FormRequest
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
        'districts' => 'les quartiers',
        'specialties' => 'les spécialités',
        'languages' => 'les langues',
        'mandate_types' => 'les mandats',
        'fee_note' => 'les frais d’agence',
        'rent_min_cents' => 'les loyers',
        'rent_max_cents' => 'les loyers',
        'accepts_garantme' => 'Garantme',
        'accepts_foreign_files' => 'les dossiers étrangers',
    ];

    public function authorize(): bool
    {
        /** @var Agency|null $agency */
        $agency = $this->route('agency');

        return $agency !== null && ($this->user()?->can('update', $agency) ?? false);
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
            'districts' => ['sometimes', 'nullable', 'array'],
            'districts.*' => ['integer', 'between:1,20'],
            'specialties' => ['sometimes', 'nullable', 'array'],
            'specialties.*' => [Rule::enum(AgencySpecialty::class)],
            'languages' => ['sometimes', 'nullable', 'array'],
            'languages.*' => [Rule::enum(SpokenLanguage::class)],
            'mandate_types' => ['sometimes', 'nullable', 'array'],
            'mandate_types.*' => [Rule::enum(MandateType::class)],
            'fee_note' => ['sometimes', 'nullable', 'string', 'max:255'],
            'rent_min_cents' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000000'],
            'rent_max_cents' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000000'],
            'accepts_garantme' => ['sometimes', 'nullable', 'boolean'],
            'accepts_foreign_files' => ['sometimes', 'nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            ...(new StoreAgencyRequest)->attributes(),
            'districts' => 'quartiers',
            'specialties' => 'spécialités',
            'languages' => 'langues',
            'mandate_types' => 'mandats',
            'fee_note' => 'frais d’agence',
            'rent_min_cents' => 'loyer minimum',
            'rent_max_cents' => 'loyer maximum',
            'accepts_garantme' => 'Garantme',
            'accepts_foreign_files' => 'dossiers étrangers',
        ];
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
