<?php

declare(strict_types=1);

namespace App\Enums;

use Carbon\CarbonImmutable;

/**
 * Fenêtre de temps du journal d'activité. Le journal grossit sans fin :
 * la page en montre les trente derniers jours par défaut.
 */
enum ActivityPeriod: string
{
    case Today = 'today';
    case Week = 'week';
    case Month = 'month';
    case Quarter = 'quarter';
    case Year = 'year';
    case All = 'all';

    public static function default(): self
    {
        return self::Month;
    }

    public function label(): string
    {
        return match ($this) {
            self::Today => "Aujourd'hui",
            self::Week => '7 derniers jours',
            self::Month => '30 derniers jours',
            self::Quarter => '3 derniers mois',
            self::Year => '12 derniers mois',
            self::All => 'Depuis le début',
        };
    }

    /** Début de la fenêtre, ou null pour tout l'historique. */
    public function since(?CarbonImmutable $now = null): ?CarbonImmutable
    {
        $now ??= CarbonImmutable::now();

        return match ($this) {
            self::Today => $now->startOfDay(),
            self::Week => $now->subDays(7)->startOfDay(),
            self::Month => $now->subDays(30)->startOfDay(),
            self::Quarter => $now->subMonths(3)->startOfDay(),
            self::Year => $now->subMonths(12)->startOfDay(),
            self::All => null,
        };
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
