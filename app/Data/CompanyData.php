<?php

declare(strict_types=1);

namespace App\Data;

/**
 * Données validées d'une entreprise (création ou modification).
 */
final readonly class CompanyData
{
    public function __construct(
        public string $name,
        public ?string $email,
        public ?string $phone,
        public ?string $website,
        public ?string $street,
        public ?string $postalCode,
        public ?string $city,
        public ?string $notes,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            name: trim((string) $data['name']),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            website: self::blankToNull($data['website'] ?? null),
            street: self::blankToNull($data['street'] ?? null),
            postalCode: self::blankToNull($data['postal_code'] ?? null),
            city: self::blankToNull($data['city'] ?? null),
            notes: self::blankToNull($data['notes'] ?? null),
        );
    }

    /**
     * @return array{name: string, email: string|null, phone: string|null, website: string|null, street: string|null, postal_code: string|null, city: string|null, notes: string|null}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'website' => $this->website,
            'street' => $this->street,
            'postal_code' => $this->postalCode,
            'city' => $this->city,
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
