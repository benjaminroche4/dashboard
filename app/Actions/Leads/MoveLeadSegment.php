<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadSegment;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Déplace un lead entre « Tous les leads » et « Leads propriétaires » en posant
 * ou en retirant le type de demande « Gestion locative ». Sans effet s'il y est déjà.
 */
final readonly class MoveLeadSegment
{
    public function handle(Lead $lead, LeadSegment $segment, ?User $by = null): Lead
    {
        if (LeadSegment::fromLead($lead) === $segment) {
            return $lead;
        }

        $lead->help_type = $segment === LeadSegment::Owner ? WebsiteHelpType::RentalManagement : null;
        $lead->save();

        $lead->notes()->create(['body' => "Lead déplacé dans les {$segment->label()}.", 'user_id' => $by?->id]);
        event(new DashboardUpdated('leads', ['id' => $lead->id], "a déplacé le lead {$lead->fullName()} dans les {$segment->label()}", $by));

        return $lead;
    }
}
