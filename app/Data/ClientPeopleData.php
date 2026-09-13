<?php

declare(strict_types=1);

namespace App\Data;

use App\Support\PersonName;

/**
 * Personnes d'un dossier : le second locataire du foyer et le membre qui suit
 * le dossier. Tout est facultatif ; les noms sont capitalisés.
 */
final readonly class ClientPeopleData
{
    public function __construct(
        public ?string $coFirstName,
        public ?string $coLastName,
        public ?string $coEmail,
        public ?string $coPhone,
        public ?int $assignedTo,
        /** Le responsable n'est écrit que si le formulaire l'a envoyé. */
        public bool $assigneeProvided = false,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $firstName = self::blankToNull($data['co_first_name'] ?? null);
        $lastName = self::blankToNull($data['co_last_name'] ?? null);
        $assignedTo = $data['assigned_to'] ?? null;

        return new self(
            coFirstName: $firstName === null ? null : PersonName::capitalize($firstName),
            coLastName: $lastName === null ? null : PersonName::capitalize($lastName),
            coEmail: self::blankToNull($data['co_email'] ?? null),
            coPhone: self::blankToNull($data['co_phone'] ?? null),
            assignedTo: $assignedTo === null || $assignedTo === '' ? null : (int) $assignedTo,
            assigneeProvided: array_key_exists('assigned_to', $data),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'co_first_name' => $this->coFirstName,
            'co_last_name' => $this->coLastName,
            'co_email' => $this->coEmail,
            'co_phone' => $this->coPhone,
            // Absent du formulaire : le responsable reste celui du lead.
            ...$this->assigneeProvided ? ['assigned_to' => $this->assignedTo] : [],
        ];
    }

    /** Nom complet du second locataire, null s'il n'est pas nommé. */
    public function coFullName(): ?string
    {
        $name = trim(($this->coFirstName ?? '').' '.($this->coLastName ?? ''));

        return $name === '' ? null : $name;
    }

    private static function blankToNull(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;

        return $value === null || $value === '' ? null : (string) $value;
    }
}
