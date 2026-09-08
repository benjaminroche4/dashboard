<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Orientation d'un bien.
 */
enum Orientation: string
{
    case North = 'north';
    case South = 'south';
    case East = 'east';
    case West = 'west';

    public function label(): string
    {
        return match ($this) {
            self::North => 'Nord',
            self::South => 'Sud',
            self::East => 'Est',
            self::West => 'Ouest',
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
