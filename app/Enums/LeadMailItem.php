<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Éléments qu'on peut envoyer à un lead depuis sa fiche.
 */
enum LeadMailItem: string
{
    case Recap = 'recap';
    case PaymentLink = 'payment_link';
    case ContractLink = 'contract_link';

    public function label(): string
    {
        return match ($this) {
            self::Recap => 'Récapitulatif du dossier',
            self::PaymentLink => 'Lien de paiement',
            self::ContractLink => 'Lien du contrat',
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
