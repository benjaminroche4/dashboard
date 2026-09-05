<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Meublé ou non.
 */
enum Furnished: string
{
    case Furnished = 'furnished';
    case Unfurnished = 'unfurnished';
    case Either = 'either';

    public function label(): string
    {
        return match ($this) {
            self::Furnished => 'Meublé',
            self::Unfurnished => 'Non meublé',
            self::Either => 'Indifférent',
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
