<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Type de garant.
 */
enum GuarantorType: string
{
    case Individual = 'physique';
    case Garantme = 'garantme';
    case Bank = 'bancaire';

    public function label(): string
    {
        return match ($this) {
            self::Individual => 'Garant physique',
            self::Garantme => 'Garantme',
            self::Bank => 'Garantie bancaire',
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
