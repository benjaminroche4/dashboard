<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\OwnerKind;
use App\Support\PersonName;

/**
 * Une ligne de propriétaire collée depuis un tableur. Une raison sociale sans
 * prénom ni nom fait une société ; sinon c'est un particulier.
 */
final readonly class OwnerImportRowData
{
    public function __construct(
        public string $firstName,
        public string $lastName,
        public ?string $company,
        public ?string $email,
        public ?string $phone,
        public ?string $street,
        public ?string $postalCode,
        public ?string $city,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            firstName: PersonName::capitalize((string) ($data['first_name'] ?? '')),
            lastName: PersonName::capitalize((string) ($data['last_name'] ?? '')),
            company: self::blankToNull($data['company'] ?? null),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            street: self::blankToNull($data['street'] ?? null),
            postalCode: self::blankToNull($data['postal_code'] ?? null),
            city: self::blankToNull($data['city'] ?? null),
        );
    }

    /** Un propriétaire sans personne nommée est une société. */
    public function kind(): OwnerKind
    {
        return trim("{$this->firstName} {$this->lastName}") === '' ? OwnerKind::Company : OwnerKind::Individual;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'company' => $this->company,
            'email' => $this->email,
            'phone' => $this->phone,
            'street' => $this->street,
            'postal_code' => $this->postalCode,
            'city' => $this->city,
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
