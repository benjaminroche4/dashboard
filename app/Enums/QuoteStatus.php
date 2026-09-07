<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Cycle de vie d'un devis : brouillon → envoyé → accepté → facturé,
 * avec refus possible tant qu'il n'est pas facturé et expiration automatique.
 */
enum QuoteStatus: string
{
    case Draft = 'draft';
    case Sent = 'sent';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case Expired = 'expired';
    case Invoiced = 'invoiced';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Brouillon',
            self::Sent => 'Envoyé',
            self::Accepted => 'Accepté',
            self::Declined => 'Refusé',
            self::Expired => 'Expiré',
            self::Invoiced => 'Facturé',
        };
    }

    /**
     * Transitions autorisées depuis ce statut.
     *
     * @return list<self>
     */
    public function transitions(): array
    {
        return match ($this) {
            self::Draft => [self::Sent, self::Accepted, self::Declined, self::Invoiced],
            self::Sent => [self::Accepted, self::Declined, self::Expired, self::Invoiced],
            self::Accepted => [self::Invoiced, self::Declined],
            self::Expired => [self::Sent, self::Accepted, self::Invoiced],
            self::Declined, self::Invoiced => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->transitions(), true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
