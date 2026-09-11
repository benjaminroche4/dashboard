<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use App\Data\PropertyTransitData;
use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyFloor;
use App\Enums\PropertyStatus;
use App\Enums\PropertyType;
use App\Enums\TransitKind;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class StorePropertyRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return self::propertyRules();
    }

    /**
     * Règles d'un bien, réutilisées telles quelles (préfixées) par la planification d'une visite.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public static function propertyRules(string $prefix = ''): array
    {
        return [
            $prefix.'street' => ['required', 'string', 'max:255'],
            $prefix.'postal_code' => ['nullable', 'string', 'max:20'],
            $prefix.'city' => ['nullable', 'string', 'max:255'],
            $prefix.'district' => ['nullable', 'integer', 'min:1', 'max:20'],
            $prefix.'property_type' => ['nullable', Rule::enum(PropertyType::class)],
            $prefix.'status' => ['nullable', Rule::enum(PropertyStatus::class)],
            $prefix.'furnished' => ['nullable', Rule::enum(Furnished::class)],
            $prefix.'rooms' => ['nullable', 'integer', 'min:1', 'max:30'],
            $prefix.'bedrooms' => ['nullable', 'integer', 'min:0', 'max:30'],
            $prefix.'bathrooms' => ['nullable', 'integer', 'min:0', 'max:10'],
            $prefix.'surface_m2' => ['nullable', 'integer', 'min:1', 'max:5000'],
            $prefix.'floor' => ['nullable', Rule::enum(PropertyFloor::class)],
            $prefix.'building_floors' => ['nullable', 'integer', 'min:0', 'max:60'],
            $prefix.'orientations' => ['nullable', 'array'],
            $prefix.'orientations.*' => [Rule::enum(Orientation::class), 'distinct'],
            $prefix.'amenities' => ['nullable', 'array'],
            $prefix.'amenities.*' => [Rule::enum(PropertyAmenity::class), 'distinct'],
            $prefix.'lease_type' => ['nullable', Rule::enum(LeaseType::class)],
            $prefix.'rent_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            $prefix.'charges_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            $prefix.'charges_included' => ['nullable', 'boolean'],
            $prefix.'deposit_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            $prefix.'currency' => ['nullable', Rule::enum(Currency::class)],
            $prefix.'listing_url' => ['nullable', 'url:http,https', 'max:2048'],
            $prefix.'agent_id' => ['nullable', 'integer', Rule::exists('agents', 'id')],
            $prefix.'owner_id' => ['nullable', 'integer', Rule::exists('owners', 'id')],
            $prefix.'partner_id' => ['nullable', 'integer', Rule::exists('partners', 'id')],
            // Transports proches, tels que l'équipe les a relus (proposés par l'IA).
            $prefix.'transit' => ['nullable', 'array', 'max:'.PropertyTransitData::MAX_STOPS],
            $prefix.'transit.*.kind' => ['required', Rule::enum(TransitKind::class)],
            $prefix.'transit.*.name' => ['required', 'string', 'max:120'],
            $prefix.'transit.*.lines' => ['nullable', 'array', 'max:6'],
            $prefix.'transit.*.lines.*' => ['string', 'max:12'],
            $prefix.'transit.*.minutes' => ['nullable', 'integer', 'min:1', 'max:60'],
            $prefix.'photos' => ['nullable', 'array', 'max:10'],
            $prefix.'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
            // Photos déjà enregistrées que le formulaire garde (modification).
            $prefix.'kept_photos' => ['nullable', 'array', 'max:10'],
            $prefix.'kept_photos.*' => ['string', 'max:1024'],
            $prefix.'notes' => ['nullable', 'string', 'max:3000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return self::propertyAttributes();
    }

    /**
     * @return array<string, string>
     */
    public static function propertyAttributes(string $prefix = ''): array
    {
        return [
            $prefix.'street' => 'adresse',
            $prefix.'postal_code' => 'code postal',
            $prefix.'city' => 'ville',
            $prefix.'district' => 'arrondissement',
            $prefix.'property_type' => 'type de bien',
            $prefix.'status' => 'statut',
            $prefix.'furnished' => 'meublé',
            $prefix.'rooms' => 'pièces',
            $prefix.'surface_m2' => 'surface',
            $prefix.'floor' => 'étage',
            $prefix.'bedrooms' => 'chambres',
            $prefix.'bathrooms' => 'salles de bain',
            $prefix.'building_floors' => "étages de l'immeuble",
            $prefix.'orientations' => 'orientations',
            $prefix.'amenities' => 'équipements',
            $prefix.'deposit_cents' => 'dépôt de garantie',
            $prefix.'lease_type' => 'type de bail',
            $prefix.'rent_cents' => 'loyer',
            $prefix.'charges_cents' => 'charges',
            $prefix.'charges_included' => 'charges comprises',
            $prefix.'currency' => 'devise',
            $prefix.'listing_url' => 'lien de l’annonce',
            $prefix.'agent_id' => 'agent immobilier',
            $prefix.'owner_id' => 'propriétaire',
            $prefix.'photos' => 'photos',
            $prefix.'photos.*' => 'photo',
            $prefix.'kept_photos' => 'photos conservées',
            $prefix.'notes' => 'notes',
        ];
    }
}
