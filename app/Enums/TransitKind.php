<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Nature d'un arrêt de transport proche d'un bien.
 */
enum TransitKind: string
{
    case Metro = 'metro';
    case Rer = 'rer';
    case Tram = 'tram';
    case Bus = 'bus';

    public function label(): string
    {
        return match ($this) {
            self::Metro => 'Métro',
            self::Rer => 'RER',
            self::Tram => 'Tram',
            self::Bus => 'Bus',
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
