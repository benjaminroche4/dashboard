<?php

declare(strict_types=1);

namespace App\Data;

/**
 * Données validées d'une agence immobilière (création ou modification).
 */
final readonly class AgencyData
{
    public function __construct(
        public string $name,
        public ?string $street,
        public ?string $postalCode,
        public ?string $city,
        public ?string $phone,
        public ?string $email,
        public ?string $website,
        public ?string $notes,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            name: trim((string) $data['name']),
            street: self::blankToNull($data['street'] ?? null),
            postalCode: self::blankToNull($data['postal_code'] ?? null),
            city: self::blankToNull($data['city'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            email: self::blankToNull($data['email'] ?? null),
            website: self::blankToNull($data['website'] ?? null),
            notes: self::blankToNull($data['notes'] ?? null),
        );
    }

    /**
     * @return array{name: string, street: string|null, postal_code: string|null, city: string|null, phone: string|null, email: string|null, website: string|null, notes: string|null}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'street' => $this->street,
            'postal_code' => $this->postalCode,
            'city' => $this->city,
            'phone' => $this->phone,
            'email' => $this->email,
            'website' => $this->website,
            'notes' => $this->notes,
        ];
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
