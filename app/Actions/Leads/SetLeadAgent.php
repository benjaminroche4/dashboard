<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Agent;
use App\Models\Lead;

/**
 * Désigne l'agent immobilier en contact sur un lead (ou le retire).
 */
final class SetLeadAgent
{
    public function handle(Lead $lead, ?Agent $agent): Lead
    {
        if ($lead->agent_id === $agent?->id) {
            return $lead;
        }

        $lead->agent_id = $agent?->id;
        $lead->save();

        $message = $agent instanceof Agent
            ? "a mis {$agent->fullName()} en contact sur le lead {$lead->fullName()}"
            : "a retiré l'agent immobilier du lead {$lead->fullName()}";
        event(new DashboardUpdated('leads', ['id' => $lead->id], $message));

        return $lead;
    }
}
