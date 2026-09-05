<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Type de bien recherché.
 */
enum PropertyType: string
{
    case Studio = 'studio';
    case T1 = 't1';
    case T2 = 't2';
    case T3 = 't3';
    case T4 = 't4';
    case LargeApartment = 'grand_appartement';
    case Duplex = 'duplex';
    case Loft = 'loft';
    case House = 'maison';

    public function label(): string
    {
        return match ($this) {
            self::Studio => 'Studio',
            self::T1 => 'T1',
            self::T2 => 'T2',
            self::T3 => 'T3',
            self::T4 => 'T4',
            self::LargeApartment => 'Grand appartement',
            self::Duplex => 'Duplex',
            self::Loft => 'Loft',
            self::House => 'Maison',
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
