<?php

declare(strict_types=1);

namespace App\Http\Requests\Partners;

use App\Enums\RelationshipQuality;
use App\Models\Partner;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Modification en place d'un ou plusieurs champs d'un partenaire depuis sa
 * fiche (28 octobre 2026, comme les fiches agent et agence) : seuls les
 * champs envoyés sont validés et écrits, avec les règles de `StorePartnerRequest`.
 */
class UpdatePartnerFieldsRequest extends FormRequest
{
    /** Champs modifiables en place, avec leur nom lisible pour le journal. */
    public const array FIELDS = [
        'phone' => 'le téléphone',
        'email' => 'l’e-mail',
        'website' => 'le site web',
        'street' => 'l’adresse',
        'postal_code' => 'l’adresse',
        'city' => 'l’adresse',
        'relationship_quality' => 'la qualité de la relation',
        'notes' => 'les notes',
    ];

    public function authorize(): bool
    {
        /** @var Partner|null $partner */
        $partner = $this->route('partner');

        return $partner !== null && ($this->user()?->can('update', $partner) ?? false);
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
            'relationship_quality' => ['sometimes', 'nullable', Rule::enum(RelationshipQuality::class)],
            'notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return (new StorePartnerRequest)->attributes();
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
