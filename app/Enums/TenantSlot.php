<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\Lead;

/**
 * Emplacement d'un locataire dans le dossier : le locataire principal, ou le
 * second locataire. Les garants et les membres du suivi n'en ont pas.
 */
enum TenantSlot: string
{
    case Primary = 'primary';
    case Co = 'co';

    public function label(): string
    {
        return match ($this) {
            self::Primary => 'Locataire',
            self::Co => 'Second locataire',
        };
    }

    /** Nom de la personne occupant cet emplacement sur un dossier. */
    public function name(Lead $lead): string
    {
        return match ($this) {
            self::Primary => $lead->fullName(),
            self::Co => trim(($lead->co_first_name ?? '').' '.($lead->co_last_name ?? '')) ?: $this->label(),
        };
    }
}
