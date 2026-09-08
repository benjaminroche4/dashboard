<?php

declare(strict_types=1);

namespace App\Http\Requests\Owners;

use App\Enums\Furnished;
use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\OwnerPropertyType;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyStatus;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOwnerLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Lead::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return self::ownerLeadRules();
    }

    /**
     * Règles partagées avec la modification : contact au niveau racine, bien proposé dans `property`.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public static function ownerLeadRules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:40', 'required_without:email'],
            'company' => ['nullable', 'string', 'max:120'],
            'language' => ['nullable', Rule::enum(LeadLanguage::class)],
            'source' => ['nullable', Rule::enum(LeadSource::class)],
            'source_note' => ['nullable', 'string', 'max:255'],
            'assigned_to' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'property' => ['nullable', 'array'],
            'property.address' => ['nullable', 'string', 'max:255'],
            'property.place_id' => ['nullable', 'string', 'max:255'],
            'property.property_type' => ['nullable', Rule::enum(OwnerPropertyType::class)],
            'property.property_status' => ['nullable', Rule::enum(PropertyStatus::class)],
            'property.bedrooms' => ['nullable', 'integer', 'between:0,5'],
            'property.bathrooms' => ['nullable', 'integer', 'between:1,4'],
            'property.surface' => ['nullable', 'integer', 'min:0'],
            'property.floor' => ['nullable', 'integer', 'between:-5,99'],
            'property.building_floors' => ['nullable', 'integer', 'between:0,99'],
            'property.furnishing' => ['nullable', Rule::in([Furnished::Furnished->value, Furnished::Unfurnished->value])],
            'property.orientations' => ['nullable', 'array'],
            'property.orientations.*' => [Rule::enum(Orientation::class), 'distinct'],
            'property.lease_types' => ['nullable', 'array'],
            'property.lease_types.*' => [Rule::enum(LeaseType::class), 'distinct'],
            'property.rent_cents' => ['nullable', 'integer', 'min:0'],
            'property.charges_cents' => ['nullable', 'integer', 'min:0'],
            'property.deposit_cents' => ['nullable', 'integer', 'min:0'],
            'property.amenities' => ['nullable', 'array'],
            'property.amenities.*' => [Rule::enum(PropertyAmenity::class), 'distinct'],
            'property.note' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return self::ownerLeadAttributes();
    }

    /**
     * @return array<string, string>
     */
    public static function ownerLeadAttributes(): array
    {
        return [
            'first_name' => 'prénom',
            'last_name' => 'nom',
            'email' => 'e-mail',
            'phone' => 'téléphone',
            'company' => 'société',
            'language' => 'langue',
            'source' => 'source',
            'source_note' => 'note sur la source',
            'assigned_to' => 'responsable',
            'property.address' => 'adresse du bien',
            'property.place_id' => 'lieu',
            'property.property_type' => 'type de bien',
            'property.property_status' => 'disponibilité',
            'property.bedrooms' => 'chambres',
            'property.bathrooms' => 'salles de bain',
            'property.surface' => 'surface',
            'property.floor' => 'étage',
            'property.building_floors' => "étages de l'immeuble",
            'property.furnishing' => 'meublé',
            'property.orientations' => 'orientation',
            'property.orientations.*' => 'orientation',
            'property.lease_types' => 'types de bail',
            'property.lease_types.*' => 'type de bail',
            'property.rent_cents' => 'loyer',
            'property.charges_cents' => 'charges',
            'property.deposit_cents' => 'dépôt de garantie',
            'property.amenities' => 'équipements',
            'property.amenities.*' => 'équipement',
            'property.note' => 'note libre',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return self::ownerLeadMessages();
    }

    /**
     * @return array<string, string>
     */
    public static function ownerLeadMessages(): array
    {
        return [
            'email.required_without' => 'Indiquez au moins un e-mail ou un téléphone.',
            'phone.required_without' => 'Indiquez au moins un e-mail ou un téléphone.',
        ];
    }
}
