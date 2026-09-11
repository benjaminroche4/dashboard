<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\PropertyFloor;
use App\Enums\PropertyType;
use App\Support\JsonSchema;

/**
 * Bien lu par l'assistant dans une annonce : mêmes champs que le formulaire
 * d'un bien, tous facultatifs sauf la rue. Les valeurs sont normalisées
 * (enums vérifiés, arrondissement déduit du code postal).
 */
final readonly class ListingExtractionData
{
    /**
     * @param  list<string>  $highlights  Points saillants de l'annonce, en français
     */
    public function __construct(
        public string $street,
        public ?string $postalCode,
        public ?string $city,
        public ?int $district,
        public ?PropertyType $propertyType,
        public ?Furnished $furnished,
        public ?int $rooms,
        public ?int $surfaceM2,
        public ?int $floor,
        public ?LeaseType $leaseType,
        public ?int $rentCents,
        public ?int $chargesCents,
        public Currency $currency,
        public ?string $listingUrl,
        public ?string $agentName,
        public ?string $agencyName,
        public ?string $notes,
        public array $highlights,
    ) {}

    /**
     * Schéma JSON demandé à l'assistant (sorties structurées).
     *
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        $nullable = JsonSchema::nullable(...);

        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['street', 'postal_code', 'city', 'district', 'property_type', 'furnished', 'rooms', 'surface_m2', 'floor', 'lease_type', 'rent', 'charges', 'currency', 'agent_name', 'agency_name', 'notes', 'highlights'],
            'properties' => [
                'street' => ['type' => 'string', 'description' => 'Numéro et rue. Chaîne vide si aucune adresse.'],
                'postal_code' => $nullable('string'),
                'city' => $nullable('string'),
                // Bornes dites dans la description : l'API refuse `minimum` / `maximum`.
                'district' => $nullable('integer', ['description' => 'Arrondissement de Paris, de 1 à 20']),
                'property_type' => JsonSchema::nullableEnum(JsonSchema::values(PropertyType::class)),
                'furnished' => JsonSchema::nullableEnum([Furnished::Furnished->value, Furnished::Unfurnished->value]),
                'rooms' => $nullable('integer', ['description' => 'Nombre de pièces, au moins 1']),
                'surface_m2' => $nullable('integer', ['description' => 'Surface en m², au moins 1']),
                'floor' => $nullable('integer', ['description' => 'Étage, 0 = rez-de-chaussée']),
                'lease_type' => JsonSchema::nullableEnum(JsonSchema::values(LeaseType::class)),
                'rent' => $nullable('number', ['description' => 'Loyer mensuel charges comprises, en unités de la devise']),
                'charges' => $nullable('number', ['description' => 'Charges mensuelles en unités, si indiquées séparément']),
                'currency' => ['type' => 'string', 'enum' => array_map(fn (Currency $currency): string => $currency->value, Currency::cases())],
                'agent_name' => $nullable('string'),
                'agency_name' => $nullable('string'),
                'notes' => $nullable('string', ['description' => 'Résumé en 2 ou 3 phrases, en français : atouts, contraintes, disponibilité']),
                // La limite se dit dans la description : l'API refuse `maxItems`.
                'highlights' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Six points saillants au maximum, en français'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data  Réponse brute de l'assistant
     */
    public static function from(array $data, ?string $listingUrl = null): self
    {
        $postalCode = self::string($data['postal_code'] ?? null);
        $district = self::int($data['district'] ?? null);

        if (($district === null || $district < 1 || $district > 20) && $postalCode !== null && preg_match('/^750(\d{2})$/', $postalCode, $matches) === 1) {
            $fromPostal = (int) $matches[1];
            $district = $fromPostal >= 1 && $fromPostal <= 20 ? $fromPostal : null;
        }

        $rent = self::money($data['rent'] ?? null);
        $city = self::string($data['city'] ?? null);

        return new self(
            street: trim((string) ($data['street'] ?? '')),
            postalCode: $postalCode,
            city: $city ?? ($district !== null ? 'Paris' : null),
            district: $district !== null && $district >= 1 && $district <= 20 ? $district : null,
            propertyType: PropertyType::tryFrom((string) ($data['property_type'] ?? '')),
            furnished: Furnished::tryFrom((string) ($data['furnished'] ?? '')),
            rooms: self::int($data['rooms'] ?? null),
            surfaceM2: self::int($data['surface_m2'] ?? null),
            floor: self::int($data['floor'] ?? null),
            leaseType: LeaseType::tryFrom((string) ($data['lease_type'] ?? '')),
            rentCents: $rent,
            chargesCents: self::money($data['charges'] ?? null),
            currency: Currency::tryFrom((string) ($data['currency'] ?? '')) ?? Currency::EUR,
            listingUrl: $listingUrl,
            agentName: self::string($data['agent_name'] ?? null),
            agencyName: self::string($data['agency_name'] ?? null),
            notes: self::string($data['notes'] ?? null),
            highlights: array_values(array_filter(array_map(fn (mixed $item): string => trim((string) $item), (array) ($data['highlights'] ?? [])), fn (string $item): bool => $item !== '')),
        );
    }

    /**
     * Valeurs du formulaire front (`PropertyForm`), loyer et charges en unités.
     *
     * @return array<string, mixed>
     */
    public function toForm(): array
    {
        return [
            'street' => $this->street,
            'postal_code' => $this->postalCode ?? '',
            'city' => $this->city ?? 'Paris',
            'district' => $this->district === null ? '' : (string) $this->district,
            'property_type' => $this->propertyType instanceof PropertyType ? $this->propertyType->value : '',
            'furnished' => $this->furnished instanceof Furnished ? $this->furnished->value : '',
            'rooms' => $this->rooms === null ? '' : (string) $this->rooms,
            'surface_m2' => $this->surfaceM2 === null ? '' : (string) $this->surfaceM2,
            // L'annonce donne un nombre ; le formulaire choisit dans une liste.
            'floor' => $this->floor === null ? '' : PropertyFloor::fromNumber($this->floor)->value,
            'lease_type' => $this->leaseType instanceof LeaseType ? $this->leaseType->value : '',
            'rent' => $this->rentCents === null ? '' : (string) ($this->rentCents / 100),
            'charges' => $this->chargesCents === null ? '' : (string) ($this->chargesCents / 100),
            'currency' => $this->currency->value,
            'listing_url' => $this->listingUrl ?? '',
            'notes' => $this->notes ?? '',
        ];
    }

    /**
     * Champs effectivement lus (non vides), pour signaler ce que l'IA a rempli.
     *
     * @return list<string>
     */
    public function filledFields(): array
    {
        return array_keys(array_filter($this->toForm(), fn (mixed $value): bool => $value !== '' && $value !== null));
    }

    private static function string(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private static function int(mixed $value): ?int
    {
        return is_int($value) || is_float($value) || (is_string($value) && is_numeric($value)) ? (int) $value : null;
    }

    private static function money(mixed $value): ?int
    {
        if (! is_int($value) && ! is_float($value) && (! is_string($value) || ! is_numeric($value))) {
            return null;
        }

        $cents = (int) round((float) $value * 100);

        return $cents > 0 ? $cents : null;
    }
}
