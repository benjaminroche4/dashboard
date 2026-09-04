<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Devises de facturation d'une société suisse.
 */
enum Currency: string
{
    case CHF = 'CHF';
    case EUR = 'EUR';

    public function label(): string
    {
        return match ($this) {
            self::CHF => 'Franc suisse (CHF)',
            self::EUR => 'Euro (EUR)',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
