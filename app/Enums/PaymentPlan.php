<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Modalité de paiement proposée au lead : tout de suite en totalité, ou un acompte.
 */
enum PaymentPlan: string
{
    case Full = 'full';
    case Deposit = 'deposit';

    public function label(): string
    {
        return match ($this) {
            self::Full => 'Sans acompte, paiement en totalité',
            self::Deposit => 'Acompte de 50 %',
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
