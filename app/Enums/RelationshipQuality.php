<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Qualité de la relation avec un agent immobilier, telle que l'équipe la
 * ressent. Miroir front : resources/js/lib/relationship-quality.ts.
 */
enum RelationshipQuality: string
{
    case Excellent = 'excellent';
    case Good = 'good';
    case ToBuild = 'to_build';
    case Difficult = 'difficult';

    public function label(): string
    {
        return match ($this) {
            self::Excellent => 'Excellente',
            self::Good => 'Bonne',
            self::ToBuild => 'À construire',
            self::Difficult => 'Difficile',
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
