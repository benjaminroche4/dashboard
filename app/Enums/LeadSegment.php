<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\Lead;

/**
 * Liste où vit un lead : « Tous les leads » (locataire) ou « Leads propriétaires »
 * (demande de gestion locative, `leads.help_type`).
 */
enum LeadSegment: string
{
    case Tenant = 'tenant';
    case Owner = 'owner';

    public static function fromLead(Lead $lead): self
    {
        return $lead->help_type === WebsiteHelpType::RentalManagement ? self::Owner : self::Tenant;
    }

    public function label(): string
    {
        return match ($this) {
            self::Tenant => 'Leads locataires',
            self::Owner => 'Leads propriétaires',
        };
    }
}
