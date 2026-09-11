<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyFloor;
use App\Enums\PropertyStatus;
use App\Enums\PropertyType;
use App\Support\PropertyTitle;
use Illuminate\Http\UploadedFile;

/**
 * Données validées d'un bien (création ou modification). Seule l'adresse est obligatoire.
 * Les photos téléversées sont enregistrées par l'Action, pas par `toArray()`.
 */
final readonly class PropertyData
{
    /**
     * @param  list<Orientation>  $orientations
     * @param  list<PropertyAmenity>  $amenities
     * @param  list<UploadedFile>  $photos
     */
    public function __construct(
        public string $street,
        public ?string $postalCode,
        public ?string $city,
        public ?int $district,
        /** Transports proches relus par l'équipe ; null quand rien n'a été cherché. */
        public ?PropertyTransitData $transit,
        public ?PropertyType $propertyType,
        public ?Furnished $furnished,
        public ?int $rooms,
        public ?int $bedrooms,
        public ?int $bathrooms,
        public ?int $surfaceM2,
        public ?PropertyFloor $floor,
        public ?int $buildingFloors,
        public array $orientations,
        public array $amenities,
        public ?LeaseType $leaseType,
        public ?int $rentCents,
        public ?int $chargesCents,
        public bool $chargesIncluded,
        public ?int $depositCents,
        public Currency $currency,
        public ?string $listingUrl,
        public ?int $agentId,
        public ?int $ownerId,
        public ?int $partnerId,
        public ?string $notes,
        public PropertyStatus $status = PropertyStatus::Available,
        public array $photos = [],
        /**
         * Chemins des photos déjà enregistrées que le formulaire conserve ;
         * `null` quand le formulaire ne les envoie pas (création, visite).
         *
         * @var list<string>|null
         */
        public ?array $keptPhotos = null,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $postalCode = self::blankToNull($data['postal_code'] ?? null);

        return new self(
            street: trim((string) $data['street']),
            postalCode: $postalCode,
            city: self::blankToNull($data['city'] ?? null),
            district: self::district($data['district'] ?? null, $postalCode),
            transit: is_array($data['transit'] ?? null) ? PropertyTransitData::from(['stops' => $data['transit']]) : null,
            propertyType: self::enum(PropertyType::class, $data['property_type'] ?? null),
            furnished: self::enum(Furnished::class, $data['furnished'] ?? null),
            rooms: self::int($data['rooms'] ?? null),
            bedrooms: self::int($data['bedrooms'] ?? null),
            bathrooms: self::int($data['bathrooms'] ?? null),
            surfaceM2: self::int($data['surface_m2'] ?? null),
            floor: self::enum(PropertyFloor::class, $data['floor'] ?? null),
            buildingFloors: self::int($data['building_floors'] ?? null),
            orientations: array_values(array_map(Orientation::from(...), is_array($data['orientations'] ?? null) ? $data['orientations'] : [])),
            amenities: array_values(array_map(PropertyAmenity::from(...), is_array($data['amenities'] ?? null) ? $data['amenities'] : [])),
            leaseType: self::enum(LeaseType::class, $data['lease_type'] ?? null),
            rentCents: self::int($data['rent_cents'] ?? null),
            chargesCents: self::int($data['charges_cents'] ?? null),
            chargesIncluded: (bool) ($data['charges_included'] ?? false),
            depositCents: self::int($data['deposit_cents'] ?? null),
            currency: Currency::from((string) ($data['currency'] ?? Currency::EUR->value)),
            listingUrl: self::blankToNull($data['listing_url'] ?? null),
            agentId: self::int($data['agent_id'] ?? null),
            ownerId: self::int($data['owner_id'] ?? null),
            partnerId: self::int($data['partner_id'] ?? null),
            notes: self::blankToNull($data['notes'] ?? null),
            status: self::enum(PropertyStatus::class, $data['status'] ?? null) ?? PropertyStatus::Available,
            photos: array_values(array_filter(is_array($data['photos'] ?? null) ? $data['photos'] : [], fn (mixed $file): bool => $file instanceof UploadedFile)),
            keptPhotos: is_array($data['kept_photos'] ?? null)
                ? array_values(array_filter($data['kept_photos'], is_string(...)))
                : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            // Le nom du bien est calculé, jamais saisi.
            'title' => PropertyTitle::for($this),
            'street' => $this->street,
            'postal_code' => $this->postalCode,
            'city' => $this->city,
            'district' => $this->district,
            'transit' => $this->transit?->isEmpty() === false ? $this->transit->toArray()['stops'] : null,
            'property_type' => $this->propertyType,
            'furnished' => $this->furnished,
            'rooms' => $this->rooms,
            'bedrooms' => $this->bedrooms,
            'bathrooms' => $this->bathrooms,
            'surface_m2' => $this->surfaceM2,
            'floor' => $this->floor,
            'building_floors' => $this->buildingFloors,
            'orientations' => array_map(fn (Orientation $orientation): string => $orientation->value, $this->orientations),
            'amenities' => array_map(fn (PropertyAmenity $amenity): string => $amenity->value, $this->amenities),
            'lease_type' => $this->leaseType,
            'rent_cents' => $this->rentCents,
            'charges_cents' => $this->chargesCents,
            'charges_included' => $this->chargesIncluded,
            'deposit_cents' => $this->depositCents,
            'currency' => $this->currency,
            'listing_url' => $this->listingUrl,
            'agent_id' => $this->agentId,
            'owner_id' => $this->ownerId,
            'partner_id' => $this->partnerId,
            'notes' => $this->notes,
            'status' => $this->status,
        ];
    }

    /** Arrondissement saisi, sinon déduit d'un code postal parisien 750XX. */
    private static function district(mixed $value, ?string $postalCode): ?int
    {
        $district = self::int($value);

        if ($district !== null) {
            return $district;
        }

        if ($postalCode !== null && preg_match('/^750(\d{2})$/', $postalCode, $matches) === 1) {
            $fromPostal = (int) $matches[1];

            return $fromPostal >= 1 && $fromPostal <= 20 ? $fromPostal : null;
        }

        return null;
    }

    /**
     * @template T of \BackedEnum
     *
     * @param  class-string<T>  $enum
     * @return T|null
     */
    private static function enum(string $enum, mixed $value): ?\BackedEnum
    {
        $value = self::blankToNull($value);

        return $value === null ? null : $enum::from($value);
    }

    private static function int(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    private static function blankToNull(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
