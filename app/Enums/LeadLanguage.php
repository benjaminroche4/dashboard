<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Langue de communication du prospect.
 */
enum LeadLanguage: string
{
    case French = 'fr';
    case English = 'en';

    public function label(): string
    {
        return match ($this) {
            self::French => 'Français',
            self::English => 'Anglais',
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
