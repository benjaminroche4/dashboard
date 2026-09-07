<?php

declare(strict_types=1);

namespace App\Data;

use App\Support\PersonName;

/**
 * Une ligne collée depuis un tableur : agent et nom de son agence.
 */
final readonly class AgentImportRowData
{
    public function __construct(
        public string $firstName,
        public string $lastName,
        public ?string $agency,
        public ?string $position,
        public ?string $email,
        public ?string $phone,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            firstName: PersonName::capitalize((string) $data['first_name']),
            lastName: PersonName::capitalize((string) $data['last_name']),
            agency: self::blankToNull($data['agency'] ?? null),
            position: self::blankToNull($data['position'] ?? null),
            email: self::blankToNull($data['email'] ?? null),
            phone: self::blankToNull($data['phone'] ?? null),
        );
    }

    /**
     * @return array{first_name: string, last_name: string, agency: string|null, position: string|null, email: string|null, phone: string|null}
     */
    public function toArray(): array
    {
        return [
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'agency' => $this->agency,
            'position' => $this->position,
            'email' => $this->email,
            'phone' => $this->phone,
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
