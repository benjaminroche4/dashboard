<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use App\Models\Agent;
use App\Models\Property;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Modification en place d'un ou plusieurs champs d'un bien depuis sa fiche
 * (2 novembre 2026) : critères, loyer et bail, description, et contacts
 * (propriétaire, agence, agent, partenaire) posés ensemble par l'action rapide
 * « Contacts ». Seuls les champs envoyés sont validés et écrits, avec les
 * règles du formulaire complet.
 */
class UpdatePropertyFieldsRequest extends FormRequest
{
    /** Champs modifiables en place, avec leur nom lisible pour le journal. */
    public const array FIELDS = [
        'property_type' => 'le type',
        'furnished' => 'l’ameublement',
        'surface_m2' => 'la surface',
        'rooms' => 'les pièces',
        'bedrooms' => 'les chambres',
        'bathrooms' => 'les salles de bain',
        'floor' => 'l’étage',
        'building_floors' => 'les étages de l’immeuble',
        'orientations' => 'l’orientation',
        'amenities' => 'les équipements',
        'rent_cents' => 'le loyer',
        'charges_cents' => 'les charges',
        'charges_included' => 'les charges',
        'deposit_cents' => 'le dépôt de garantie',
        'lease_type' => 'le bail',
        'listing_url' => 'l’annonce',
        'notes' => 'la description',
        'owner_id' => 'le propriétaire',
        'agency_id' => 'l’agence',
        'agent_id' => 'l’agent',
        'partner_id' => 'le partenaire',
    ];

    public function authorize(): bool
    {
        /** @var Property|null $property */
        $property = $this->route('property');

        return $property !== null && ($this->user()?->can('update', $property) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [];

        foreach (StorePropertyRequest::propertyRules() as $key => $rule) {
            $field = explode('.', $key)[0];

            if (array_key_exists($field, self::FIELDS)) {
                $rules[$key] = $key === $field ? ['sometimes', ...(array) $rule] : $rule;
            }
        }

        $rules['charges_included'] = ['sometimes', 'boolean'];
        $rules['agency_id'] = ['sometimes', 'nullable', 'integer', Rule::exists('agencies', 'id')];

        return $rules;
    }

    /**
     * Un agent choisi avec une agence doit en faire partie.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $agentId = $this->input('agent_id');
                $agencyId = $this->input('agency_id');

                if ($agentId === null || $agencyId === null || $validator->errors()->isNotEmpty()) {
                    return;
                }

                $agent = Agent::query()->find((int) $agentId);

                if ($agent?->agency_id !== null && $agent->agency_id !== (int) $agencyId) {
                    $validator->errors()->add('agent_id', __('Cet agent travaille pour une autre agence.'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [...StorePropertyRequest::propertyAttributes(), 'agency_id' => 'agence'];
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
