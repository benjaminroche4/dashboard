<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Durée d'installation envisagée.
 */
enum LeadDuration: string
{
    case Short = 'short';
    case Medium = 'medium';
    case Long = 'long';

    public function label(): string
    {
        return match ($this) {
            self::Short => 'Court terme · 1 à 3 mois',
            self::Medium => 'Moyen terme · 3 à 12 mois',
            self::Long => 'Long terme · 12 mois et plus',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
