<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ContactFunction;
use App\Support\PersonName;

/**
 * Données validées d'un interlocuteur de partenaire, noms capitalisés.
 */
final readonly class PartnerContactData
{
    public function __construct(
        public string $firstName,
        public string $lastName,
        public ?ContactFunction $position,
        public ?string $email,
        public ?string $phone,
        /** Celui que l'équipe joint d'abord chez ce partenaire. */
        public bool $isPrimary = false,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            firstName: PersonName::capitalize((string) $data['first_name']),
            lastName: PersonName::capitalize((string) $data['last_name']),
            position: ContactFunction::parse(is_string($data['position'] ?? null) ? $data['position'] : null),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            isPrimary: (bool) ($data['is_primary'] ?? false),
        );
    }

    /**
     * @return array{first_name: string, last_name: string, position: ContactFunction|null, email: string|null, phone: string|null, is_primary: bool}
     */
    public function toArray(): array
    {
        return [
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'position' => $this->position,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_primary' => $this->isPrimary,
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
