<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\EmploymentStatus;
use App\Enums\ResidencyStatus;
use App\Support\PersonName;

/**
 * Détails d'un locataire du dossier : état civil, titre de séjour et
 * situation professionnelle. Tout est facultatif, un champ vide vaut null.
 */
final readonly class TenantProfileData
{
    public function __construct(
        public ?string $birthDate,
        public ?string $nationality,
        public ?string $birthPlace,
        public ?ResidencyStatus $residencyStatus,
        public ?string $residencyNumber,
        public ?string $residencyExpiresAt,
        public ?EmploymentStatus $employmentStatus,
        public ?string $employer,
        public ?int $incomeCents,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $income = $data['income'] ?? null;

        return new self(
            birthDate: self::text($data['birth_date'] ?? null),
            nationality: PersonName::capitalize((string) self::text($data['nationality'] ?? null)) ?: null,
            birthPlace: self::text($data['birth_place'] ?? null),
            residencyStatus: self::enum(ResidencyStatus::class, $data['residency_status'] ?? null),
            residencyNumber: self::text($data['residency_number'] ?? null),
            residencyExpiresAt: self::text($data['residency_expires_at'] ?? null),
            employmentStatus: self::enum(EmploymentStatus::class, $data['employment_status'] ?? null),
            employer: self::text($data['employer'] ?? null),
            incomeCents: $income === null || $income === '' ? null : (int) round((float) $income * 100),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        // Un citoyen de l'UE n'a ni numéro ni date de validité de titre.
        $document = $this->residencyStatus?->needsDocument() ?? false;

        return [
            'birth_date' => $this->birthDate,
            'nationality' => $this->nationality,
            'birth_place' => $this->birthPlace,
            'residency_status' => $this->residencyStatus?->value,
            'residency_number' => $document ? $this->residencyNumber : null,
            'residency_expires_at' => $document ? $this->residencyExpiresAt : null,
            'employment_status' => $this->employmentStatus?->value,
            'employer' => $this->employer,
            'income_cents' => $this->incomeCents,
        ];
    }

    /** Vrai quand rien n'est renseigné : l'emplacement est alors effacé. */
    public function isEmpty(): bool
    {
        return array_filter($this->toArray(), fn (mixed $value): bool => $value !== null && $value !== '') === [];
    }

    private static function text(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text === '' ? null : $text;
    }

    /**
     * @template T of \BackedEnum
     *
     * @param  class-string<T>  $enum
     * @return T|null
     */
    private static function enum(string $enum, mixed $value): ?\BackedEnum
    {
        $text = self::text($value);

        return $text === null ? null : $enum::tryFrom($text);
    }
}
