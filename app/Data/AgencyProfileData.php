<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\AgencySpecialty;
use App\Enums\MandateType;
use App\Enums\SpokenLanguage;

/**
 * Profil de matching d'une agence, saisi sur sa fiche (jamais à la création).
 * Tout est facultatif : un champ vide efface, un champ absent laisse en place.
 */
final readonly class AgencyProfileData
{
    /**
     * @param  list<int>  $districts
     * @param  list<AgencySpecialty>  $specialties
     * @param  list<SpokenLanguage>  $languages
     * @param  list<MandateType>  $mandateTypes
     */
    public function __construct(
        public array $districts,
        public array $specialties,
        public array $languages,
        public array $mandateTypes,
        public ?string $feeNote,
        public ?int $rentMinCents,
        public ?int $rentMaxCents,
        public ?bool $acceptsGarantme,
        public ?bool $acceptsForeignFiles,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $districts = array_values(array_unique(array_filter(array_map(intval(...), (array) ($data['districts'] ?? [])), fn (int $d): bool => $d >= 1 && $d <= 20)));
        sort($districts);
        $min = self::int($data['rent_min_cents'] ?? null);
        $max = self::int($data['rent_max_cents'] ?? null);
        if ($min !== null && $max !== null && $min > $max) {
            [$min, $max] = [$max, $min];
        }

        return new self(
            districts: $districts,
            specialties: self::enums(AgencySpecialty::class, (array) ($data['specialties'] ?? [])),
            languages: self::enums(SpokenLanguage::class, (array) ($data['languages'] ?? [])),
            mandateTypes: self::enums(MandateType::class, (array) ($data['mandate_types'] ?? [])),
            feeNote: self::blankToNull($data['fee_note'] ?? null),
            rentMinCents: $min,
            rentMaxCents: $max,
            acceptsGarantme: self::bool($data['accepts_garantme'] ?? null),
            acceptsForeignFiles: self::bool($data['accepts_foreign_files'] ?? null),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'districts' => $this->districts === [] ? null : $this->districts,
            'specialties' => $this->specialties === [] ? null : $this->specialties,
            'languages' => $this->languages === [] ? null : $this->languages,
            'mandate_types' => $this->mandateTypes === [] ? null : $this->mandateTypes,
            'fee_note' => $this->feeNote,
            'rent_min_cents' => $this->rentMinCents,
            'rent_max_cents' => $this->rentMaxCents,
            'accepts_garantme' => $this->acceptsGarantme,
            'accepts_foreign_files' => $this->acceptsForeignFiles,
        ];
    }

    /**
     * @template T of \BackedEnum
     *
     * @param  class-string<T>  $enum
     * @param  array<mixed>  $values
     * @return list<T>
     */
    private static function enums(string $enum, array $values): array
    {
        $cases = [];
        foreach ($values as $value) {
            $case = $value instanceof $enum ? $value : (is_string($value) ? $enum::tryFrom($value) : null);
            if ($case !== null && ! in_array($case, $cases, true)) {
                $cases[] = $case;
            }
        }

        return $cases;
    }

    private static function int(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : max(0, (int) $value);
    }

    private static function bool(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
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
