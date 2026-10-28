<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\Furnished;
use App\Enums\LeadSegment;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\OwnerPropertyType;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyStatus;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Modification en place d'un ou plusieurs champs du bien proposé par un lead
 * propriétaire, depuis sa fiche : seuls les champs envoyés sont validés et
 * écrits, avec les règles de la Converting Machine propriétaire.
 */
class UpdateLeadPropertyFieldsRequest extends FormRequest
{
    /** Champs modifiables en place, avec leur nom lisible pour le journal. */
    public const array FIELDS = [
        'address' => "l'adresse",
        'place_id' => "l'adresse",
        'property_type' => 'le type de bien',
        'property_status' => 'la disponibilité',
        'bedrooms' => 'les chambres',
        'bathrooms' => 'les salles de bain',
        'surface' => 'la surface',
        'floor' => "l'étage",
        'building_floors' => "les étages de l'immeuble",
        'furnishing' => 'le meublé',
        'orientations' => "l'orientation",
        'lease_types' => 'le type de bail',
        'rent_cents' => 'le loyer',
        'charges_cents' => 'les charges',
        'deposit_cents' => 'le dépôt de garantie',
        'amenities' => 'les équipements',
        'note' => 'la note du propriétaire',
    ];

    public function authorize(): bool
    {
        /** @var Lead|null $lead */
        $lead = $this->route('lead');

        return $lead !== null
            && LeadSegment::fromLead($lead) === LeadSegment::Owner
            && ($this->user()?->can('update', $lead) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'place_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'property_type' => ['sometimes', 'nullable', Rule::enum(OwnerPropertyType::class)],
            'property_status' => ['sometimes', 'nullable', Rule::enum(PropertyStatus::class)],
            'bedrooms' => ['sometimes', 'nullable', 'integer', 'between:0,5'],
            'bathrooms' => ['sometimes', 'nullable', 'integer', 'between:1,4'],
            'surface' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'floor' => ['sometimes', 'nullable', 'integer', 'between:-5,99'],
            'building_floors' => ['sometimes', 'nullable', 'integer', 'between:0,99'],
            'furnishing' => ['sometimes', 'nullable', Rule::in([Furnished::Furnished->value, Furnished::Unfurnished->value])],
            'orientations' => ['sometimes', 'nullable', 'array'],
            'orientations.*' => [Rule::enum(Orientation::class), 'distinct'],
            'lease_types' => ['sometimes', 'nullable', 'array'],
            'lease_types.*' => [Rule::enum(LeaseType::class), 'distinct'],
            'rent_cents' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'charges_cents' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'deposit_cents' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'amenities' => ['sometimes', 'nullable', 'array'],
            'amenities.*' => [Rule::enum(PropertyAmenity::class), 'distinct'],
            'note' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'address' => 'adresse du bien',
            'place_id' => 'lieu',
            'property_type' => 'type de bien',
            'property_status' => 'disponibilité',
            'bedrooms' => 'chambres',
            'bathrooms' => 'salles de bain',
            'surface' => 'surface',
            'floor' => 'étage',
            'building_floors' => "étages de l'immeuble",
            'furnishing' => 'meublé',
            'orientations' => 'orientation',
            'orientations.*' => 'orientation',
            'lease_types' => 'types de bail',
            'lease_types.*' => 'type de bail',
            'rent_cents' => 'loyer',
            'charges_cents' => 'charges',
            'deposit_cents' => 'dépôt de garantie',
            'amenities' => 'équipements',
            'amenities.*' => 'équipement',
            'note' => 'note du propriétaire',
        ];
    }

    /**
     * Rien d'autre que les champs connus, même validés par accident.
     *
     * @return array<string, mixed>
     */
    public function fields(): array
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        return array_intersect_key($validated, self::FIELDS);
    }
}
