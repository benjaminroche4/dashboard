<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Events\DashboardUpdated;
use App\Models\LeadPartner;
use App\Models\User;

/**
 * Retire un partenaire du dossier d'un lead.
 */
final class DetachLeadPartner
{
    public function handle(LeadPartner $link, ?User $by = null): void
    {
        $lead = $link->lead;
        $partner = $link->partner;

        $link->delete();

        $lead->notes()->create(['body' => "Partenaire retiré : {$partner->name} ({$link->role->label()}).", 'user_id' => $by?->id]);

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a retiré le partenaire {$partner->name} du dossier {$lead->fullName()}"));
    }
}
