<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Écarte la qualification proposée par l'assistant sans rien changer au lead.
 */
final class DismissLeadQualification
{
    public function handle(Lead $lead, ?User $by = null): void
    {
        if ($lead->ai_qualification === null) {
            return;
        }

        $lead->forceFill(['ai_qualification' => null, 'ai_qualified_at' => null])->save();

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a ignoré la qualification IA du lead {$lead->fullName()}", $by));
    }
}
