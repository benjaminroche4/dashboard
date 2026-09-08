<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\OwnerPropertyType;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyStatus;
use BackedEnum;

/**
 * Bien proposé à la location par un lead propriétaire (formulaire « Proposer un bien »).
 */
final readonly class LeadPropertyData
{
    /**
     * @param  list<Orientation>  $orientations
     * @param  list<LeaseType>  $leaseTypes
     * @param  list<PropertyAmenity>  $amenities
     */
    public function __construct(
        public ?string $address,
        public ?string $placeId,
        public ?OwnerPropertyType $propertyType,
        public ?PropertyStatus $propertyStatus,
        public ?int $bedrooms,
        public ?int $bathrooms,
        public ?int $surface,
        public ?int $floor,
        public ?int $buildingFloors,
        public ?Furnished $furnishing,
        public array $orientations,
        public array $leaseTypes,
        public ?int $rentCents,
        public ?int $chargesCents,
        public ?int $depositCents,
        public array $amenities,
        public ?string $note,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            address: self::blankToNull($data['address'] ?? null),
            placeId: self::blankToNull($data['place_id'] ?? null),
            propertyType: self::enum(OwnerPropertyType::class, $data['property_type'] ?? null),
            propertyStatus: self::enum(PropertyStatus::class, $data['property_status'] ?? null),
            bedrooms: self::int($data['bedrooms'] ?? null),
            bathrooms: self::int($data['bathrooms'] ?? null),
            surface: self::int($data['surface'] ?? null),
            floor: self::int($data['floor'] ?? null),
            buildingFloors: self::int($data['building_floors'] ?? null),
            furnishing: self::enum(Furnished::class, $data['furnishing'] ?? null),
            orientations: array_values(array_map(Orientation::from(...), $data['orientations'] ?? [])),
            leaseTypes: array_values(array_map(LeaseType::from(...), $data['lease_types'] ?? [])),
            rentCents: self::int($data['rent_cents'] ?? null),
            chargesCents: self::int($data['charges_cents'] ?? null),
            depositCents: self::int($data['deposit_cents'] ?? null),
            amenities: array_values(array_map(PropertyAmenity::from(...), $data['amenities'] ?? [])),
            note: self::blankToNull($data['note'] ?? null),
        );
    }

    /** Vrai quand aucun champ n'est renseigné : rien à enregistrer. */
    public function isEmpty(): bool
    {
        return array_filter($this->toArray(), fn (mixed $value): bool => $value !== null && $value !== []) === [];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'address' => $this->address,
            'place_id' => $this->placeId,
            'property_type' => $this->propertyType,
            'property_status' => $this->propertyStatus,
            'bedrooms' => $this->bedrooms,
            'bathrooms' => $this->bathrooms,
            'surface' => $this->surface,
            'floor' => $this->floor,
            'building_floors' => $this->buildingFloors,
            'furnishing' => $this->furnishing,
            'orientations' => $this->orientations,
            'lease_types' => $this->leaseTypes,
            'rent_cents' => $this->rentCents,
            'charges_cents' => $this->chargesCents,
            'deposit_cents' => $this->depositCents,
            'amenities' => $this->amenities,
            'note' => $this->note,
        ];
    }

    private static function blankToNull(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private static function int(mixed $value): ?int
    {
        return ($value === null || $value === '') ? null : (int) $value;
    }

    /**
     * @template T of BackedEnum
     *
     * @param  class-string<T>  $class
     * @return T|null
     */
    private static function enum(string $class, mixed $value): ?BackedEnum
    {
        return ($value === null || $value === '') ? null : $class::from($value);
    }
}
