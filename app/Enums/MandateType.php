<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Mandats qu'une agence accepte : ce qu'elle fait de ses biens.
 */
enum MandateType: string
{
    case Rental = 'rental';
    case Management = 'management';
    case Sale = 'sale';

    public function label(): string
    {
        return match ($this) {
            self::Rental => 'Location',
            self::Management => 'Gestion locative',
            self::Sale => 'Vente',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }
}
