<?php

declare(strict_types=1);

namespace App\Data;

/**
 * Une ligne d'agences collée depuis un tableur.
 */
final readonly class AgencyImportRowData
{
    public function __construct(
        public string $name,
        public ?string $email,
        public ?string $phone,
        public ?string $city,
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
            city: self::blankToNull($data['city'] ?? null),
        );
    }

    /**
     * @return array{name: string, email: string|null, phone: string|null, city: string|null}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
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
