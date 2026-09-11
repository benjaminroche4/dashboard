<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Pourquoi un lead est archivé sans conversion : la donnée clé pour lire le pipeline.
 */
enum LeadLossReason: string
{
    case NotQualified = 'not_qualified';
    case BadClosing = 'bad_closing';
    case SmallBudget = 'small_budget';
    case TightTiming = 'tight_timing';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::NotQualified => 'Pas du tout qualifié',
            self::BadClosing => 'Mauvais closing',
            self::SmallBudget => 'Trop petit budget',
            self::TightTiming => 'Timing trop serré',
            self::Other => 'Autre',
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
