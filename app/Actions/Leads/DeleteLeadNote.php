<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\LeadNote;

/**
 * Retire une note interne.
 */
final class DeleteLeadNote
{
    public function handle(LeadNote $note): void
    {
        $lead = $note->lead;
        $note->delete();

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a retiré une note du lead {$lead->fullName()}"));
    }
}
