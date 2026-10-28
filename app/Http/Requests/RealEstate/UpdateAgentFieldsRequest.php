<?php

declare(strict_types=1);

namespace App\Http\Requests\RealEstate;

use App\Enums\AgencySpecialty;
use App\Enums\AgentPosition;
use App\Enums\RelationshipQuality;
use App\Enums\SpokenLanguage;
use App\Models\Agent;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Modification en place d'un ou plusieurs champs d'un agent depuis sa fiche
 * (28 octobre 2026, sur le modèle de la fiche lead) : seuls les champs
 * envoyés sont validés et écrits, avec les règles de `StoreAgentRequest`.
 */
class UpdateAgentFieldsRequest extends FormRequest
{
    /** Champs modifiables en place, avec leur nom lisible pour le journal. */
    public const array FIELDS = [
        'phone' => 'le téléphone',
        'email' => 'l’e-mail',
        'position' => 'la fonction',
        'relationship_quality' => 'la qualité de la relation',
        'agency_id' => 'l’agence',
        'street' => 'l’adresse',
        'postal_code' => 'l’adresse',
        'city' => 'l’adresse',
        'notes' => 'les notes',
        'districts' => 'les quartiers',
        'specialties' => 'les spécialités',
        'languages' => 'les langues',
    ];

    public function authorize(): bool
    {
        /** @var Agent|null $agent */
        $agent = $this->route('agent');

        return $agent !== null && ($this->user()?->can('update', $agent) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'position' => ['sometimes', 'nullable', Rule::enum(AgentPosition::class)],
            'relationship_quality' => ['sometimes', 'nullable', Rule::enum(RelationshipQuality::class)],
            'agency_id' => ['sometimes', 'nullable', 'integer', 'exists:agencies,id'],
            'street' => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            // Profil de matching, mêmes règles que `UpdateAgentProfileRequest`.
            'districts' => ['sometimes', 'nullable', 'array'],
            'districts.*' => ['integer', 'between:1,20'],
            'specialties' => ['sometimes', 'nullable', 'array'],
            'specialties.*' => [Rule::enum(AgencySpecialty::class)],
            'languages' => ['sometimes', 'nullable', 'array'],
            'languages.*' => [Rule::enum(SpokenLanguage::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return (new StoreAgentRequest)->attributes();
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
