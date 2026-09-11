<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Étage d'un bien. Une liste fermée plutôt qu'un nombre libre : au-delà du 7e,
 * l'annonce dit « et plus », et « Dernier étage » est un argument de vente qui
 * n'a pas de numéro.
 */
enum PropertyFloor: string
{
    case Ground = 'ground';
    case First = '1';
    case Second = '2';
    case Third = '3';
    case Fourth = '4';
    case Fifth = '5';
    case Sixth = '6';
    case Seventh = '7';
    case Above = 'above';
    case Top = 'top';

    public function label(): string
    {
        return match ($this) {
            self::Ground => 'Rez-de-chaussée',
            self::First => '1er étage',
            self::Second => '2e étage',
            self::Third => '3e étage',
            self::Fourth => '4e étage',
            self::Fifth => '5e étage',
            self::Sixth => '6e étage',
            self::Seventh => '7e étage',
            self::Above => '8e étage et plus',
            self::Top => 'Dernier étage',
        };
    }

    /**
     * Étage lu ailleurs sous forme de nombre (annonce importée, ancienne
     * colonne entière) : 0 = rez-de-chaussée, au-delà du 7e = « et plus ».
     */
    public static function fromNumber(?int $floor): ?self
    {
        if ($floor === null) {
            return null;
        }

        if ($floor <= 0) {
            return self::Ground;
        }

        return $floor > 7 ? self::Above : self::from((string) $floor);
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
