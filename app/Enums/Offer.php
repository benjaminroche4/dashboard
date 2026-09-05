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
            self::Accompagne => 'Offre Accompagné',
            self::Confie => 'Offre Confié',
        };
    }

    /**
     * Une phrase pour situer la formule dans le formulaire du lead.
     */
    public function summary(): string
    {
        return match ($this) {
            self::Accompagne => 'Le client cherche lui-même. Nous montons son dossier, le conseillons et l\'accompagnons jusqu\'à la signature.',
            self::Confie => 'Nous prenons tout en charge : recherche, visites, négociation. Le client n\'a plus qu\'à signer.',
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
