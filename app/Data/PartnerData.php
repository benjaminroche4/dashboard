<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\PartnerType;
use App\Enums\RelationshipQuality;

/**
 * Données validées d'un partenaire (création ou modification).
 */
final readonly class PartnerData
{
    public function __construct(
        public string $name,
        public PartnerType $type,
        public ?RelationshipQuality $relationshipQuality,
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
            type: PartnerType::from((string) $data['type']),
            relationshipQuality: is_string($data['relationship_quality'] ?? null) && $data['relationship_quality'] !== ''
                ? RelationshipQuality::from($data['relationship_quality'])
                : null,
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
     * @return array{name: string, type: string, relationship_quality: RelationshipQuality|null, email: string|null, phone: string|null, website: string|null, street: string|null, postal_code: string|null, city: string|null, notes: string|null}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'type' => $this->type->value,
            'relationship_quality' => $this->relationshipQuality,
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
