<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Les deux offres de relocation à Paris facturables.
 */
enum Offer: string
{
    case Accompagne = 'accompagne';
    case Confie = 'confie';

    public function label(): string
    {
        return match ($this) {
            self::Accompagne => 'Accompagné',
            self::Confie => 'Confié',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Accompagne => 'Relocation Paris · Offre Accompagné',
            self::Confie => 'Relocation Paris · Offre Confié',
        };
    }

    /**
     * Prix unitaire par défaut, en centimes, par devise (config/company.php).
     */
    public function defaultPriceCents(Currency $currency): int
    {
        return (int) config("company.offers.{$this->value}.{$currency->value}", 0);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
