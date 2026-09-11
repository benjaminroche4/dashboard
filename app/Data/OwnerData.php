<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\OwnerKind;
use App\Support\PersonName;

/**
 * Données validées d'un propriétaire (création ou modification) : un
 * particulier, ou une société dont l'interlocuteur est facultatif. Le prénom
 * et le nom sont toujours capitalisés.
 */
final readonly class OwnerData
{
    public function __construct(
        public OwnerKind $kind,
        public string $firstName,
        public string $lastName,
        public ?string $company,
        public ?string $email,
        public ?string $phone,
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
            kind: OwnerKind::tryFrom((string) ($data['kind'] ?? '')) ?? OwnerKind::Individual,
            firstName: PersonName::capitalize((string) ($data['first_name'] ?? '')),
            lastName: PersonName::capitalize((string) ($data['last_name'] ?? '')),
            company: self::blankToNull($data['company'] ?? null),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            street: self::blankToNull($data['street'] ?? null),
            postalCode: self::blankToNull($data['postal_code'] ?? null),
            city: self::blankToNull($data['city'] ?? null),
            notes: self::blankToNull($data['notes'] ?? null),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'kind' => $this->kind,
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'company' => $this->company,
            'email' => $this->email,
            'phone' => $this->phone,
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
