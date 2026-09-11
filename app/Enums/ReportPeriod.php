<?php

declare(strict_types=1);

namespace App\Enums;

use Carbon\CarbonInterface;

/**
 * Période couverte par un rapport : raccourcis usuels ou dates choisies.
 */
enum ReportPeriod: string
{
    case Day = 'day';
    case Week = 'week';
    case Days30 = 'days30';
    case Months6 = 'months6';
    case Months12 = 'months12';
    case Custom = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::Day => "Aujourd'hui",
            self::Week => '7 derniers jours',
            self::Days30 => '30 derniers jours',
            self::Months6 => '6 derniers mois',
            self::Months12 => '12 derniers mois',
            self::Custom => 'Période personnalisée',
        };
    }

    /**
     * Début de la période, à partir d'aujourd'hui. `null` pour une période choisie.
     * (Nom volontairement distinct de `from()`, réservé par les enums adossés.)
     */
    public function start(CarbonInterface $today): ?CarbonInterface
    {
        return match ($this) {
            self::Day => $today->copy()->startOfDay(),
            self::Week => $today->copy()->subDays(6)->startOfDay(),
            self::Days30 => $today->copy()->subDays(29)->startOfDay(),
            self::Months6 => $today->copy()->subMonths(5)->startOfMonth(),
            self::Months12 => $today->copy()->subMonths(11)->startOfMonth(),
            self::Custom => null,
        };
    }

    /**
     * Raccourcis proposés dans le sélecteur, la période choisie en dernier.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $period): array => ['value' => $period->value, 'label' => $period->label()],
            self::cases(),
        );
    }
}
