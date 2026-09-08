<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Avancement d'une visite de logement organisée pour un client.
 */
enum VisitStatus: string
{
    case Planned = 'planned';
    case Done = 'done';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Planned => 'Planifiée',
            self::Done => 'Effectuée',
            self::Cancelled => 'Annulée',
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
