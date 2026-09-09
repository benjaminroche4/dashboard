<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Disponibilité d'un bien : dans l'annuaire « Biens » (`properties.status`)
 * et sur le bien proposé par un lead propriétaire.
 */
enum PropertyStatus: string
{
    case Available = 'available';
    case UnderOffer = 'under_offer';
    case Rented = 'rented';
    case UnderRenovation = 'under_renovation';
    case Unavailable = 'unavailable';

    public function label(): string
    {
        return match ($this) {
            self::Available => 'Disponible',
            self::UnderOffer => 'Sous option',
            self::Rented => 'Loué',
            self::UnderRenovation => 'En travaux',
            self::Unavailable => 'Non disponible',
        };
    }

    /** Le bien peut encore être proposé et visité. */
    public function isOpen(): bool
    {
        return $this === self::Available || $this === self::UnderOffer;
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
