<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\PropertyType;
use Illuminate\Http\UploadedFile;

/**
 * Données validées d'un bien (création ou modification). Seule l'adresse est obligatoire.
 * Les photos téléversées sont enregistrées par l'Action, pas par `toArray()`.
 */
final readonly class PropertyData
{
    /**
     * @param  list<UploadedFile>  $photos
     */
    public function __construct(
        public ?string $title,
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
        public ?int $agentId,
        public ?int $ownerId,
        public ?string $notes,
        public array $photos = [],
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $postalCode = self::blankToNull($data['postal_code'] ?? null);

        return new self(
            title: self::blankToNull($data['title'] ?? null),
            street: trim((string) $data['street']),
            postalCode: $postalCode,
            city: self::blankToNull($data['city'] ?? null),
            district: self::district($data['district'] ?? null, $postalCode),
            propertyType: self::enum(PropertyType::class, $data['property_type'] ?? null),
            furnished: self::enum(Furnished::class, $data['furnished'] ?? null),
            rooms: self::int($data['rooms'] ?? null),
            surfaceM2: self::int($data['surface_m2'] ?? null),
            floor: self::int($data['floor'] ?? null),
            leaseType: self::enum(LeaseType::class, $data['lease_type'] ?? null),
            rentCents: self::int($data['rent_cents'] ?? null),
            chargesCents: self::int($data['charges_cents'] ?? null),
            currency: Currency::from((string) ($data['currency'] ?? Currency::EUR->value)),
            listingUrl: self::blankToNull($data['listing_url'] ?? null),
            agentId: self::int($data['agent_id'] ?? null),
            ownerId: self::int($data['owner_id'] ?? null),
            notes: self::blankToNull($data['notes'] ?? null),
            photos: array_values(array_filter(is_array($data['photos'] ?? null) ? $data['photos'] : [], fn (mixed $file): bool => $file instanceof UploadedFile)),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'street' => $this->street,
            'postal_code' => $this->postalCode,
            'city' => $this->city,
            'district' => $this->district,
            'property_type' => $this->propertyType,
            'furnished' => $this->furnished,
            'rooms' => $this->rooms,
            'surface_m2' => $this->surfaceM2,
            'floor' => $this->floor,
            'lease_type' => $this->leaseType,
            'rent_cents' => $this->rentCents,
            'charges_cents' => $this->chargesCents,
            'currency' => $this->currency,
            'listing_url' => $this->listingUrl,
            'agent_id' => $this->agentId,
            'owner_id' => $this->ownerId,
            'notes' => $this->notes,
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
