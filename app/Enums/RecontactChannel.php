<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Canal de recontact souhaité.
 */
enum RecontactChannel: string
{
    case Phone = 'phone';
    case Email = 'email';
    case WhatsApp = 'whatsapp';
    case Visio = 'visio';

    public function label(): string
    {
        return match ($this) {
            self::Phone => 'Téléphone',
            self::Email => 'E-mail',
            self::WhatsApp => 'WhatsApp',
            self::Visio => 'Visio',
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
