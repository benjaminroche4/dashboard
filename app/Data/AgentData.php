<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\AgentPosition;
use App\Support\PersonName;

/**
 * Données validées d'un agent immobilier (création ou modification).
 * Le prénom et le nom sont toujours capitalisés.
 */
final readonly class AgentData
{
    public function __construct(
        public ?int $agencyId,
        public string $firstName,
        public string $lastName,
        public ?AgentPosition $position,
        public ?string $street,
        public ?string $postalCode,
        public ?string $city,
        public ?string $email,
        public ?string $phone,
        public ?string $notes,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $agencyId = $data['agency_id'] ?? null;

        return new self(
            agencyId: $agencyId === null || $agencyId === '' ? null : (int) $agencyId,
            firstName: PersonName::capitalize((string) $data['first_name']),
            lastName: PersonName::capitalize((string) $data['last_name']),
            position: AgentPosition::parse(is_string($data['position'] ?? null) ? $data['position'] : null),
            street: self::blankToNull($data['street'] ?? null),
            postalCode: self::blankToNull($data['postal_code'] ?? null),
            city: self::blankToNull($data['city'] ?? null),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            notes: self::blankToNull($data['notes'] ?? null),
        );
    }

    /**
     * @return array{agency_id: int|null, first_name: string, last_name: string, position: AgentPosition|null, street: string|null, postal_code: string|null, city: string|null, email: string|null, phone: string|null, notes: string|null}
     */
    public function toArray(): array
    {
        return [
            'agency_id' => $this->agencyId,
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'position' => $this->position,
            'street' => $this->street,
            'postal_code' => $this->postalCode,
            'city' => $this->city,
            'email' => $this->email,
            'phone' => $this->phone,
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
