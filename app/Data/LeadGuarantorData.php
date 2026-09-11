<?php

declare(strict_types=1);

namespace App\Data;

use App\Support\PersonName;

/** Garant d'un dossier : nom capitalisé, coordonnées et revenu mensuel net. */
final readonly class LeadGuarantorData
{
    public function __construct(
        public string $firstName,
        public string $lastName,
        public ?string $email,
        public ?string $phone,
        public ?int $incomeCents,
        public ?string $note,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            firstName: PersonName::capitalize((string) $data['first_name']),
            lastName: PersonName::capitalize((string) $data['last_name']),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
            incomeCents: self::amount($data['income_cents'] ?? null),
            note: self::blankToNull($data['note'] ?? null),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'email' => $this->email,
            'phone' => $this->phone,
            'income_cents' => $this->incomeCents,
            'note' => $this->note,
        ];
    }

    public function fullName(): string
    {
        return trim("{$this->firstName} {$this->lastName}");
    }

    /** Montant en centimes, null quand le champ est vide. */
    private static function amount(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : (int) $value;
    }

    private static function blankToNull(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;

        return $value === null || $value === '' ? null : (string) $value;
    }
}
