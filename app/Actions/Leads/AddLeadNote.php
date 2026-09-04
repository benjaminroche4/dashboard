<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\User;

/**
 * Ajoute une note interne sur un lead.
 */
final class AddLeadNote
{
    public function handle(Lead $lead, string $body, ?User $by = null): LeadNote
    {
        $note = $lead->notes()->create(['body' => $body, 'user_id' => $by?->id]);

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a annoté le lead {$lead->fullName()}"));

        return $note;
    }
}
