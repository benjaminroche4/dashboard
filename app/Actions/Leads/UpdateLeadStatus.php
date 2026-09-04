<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;

/**
 * Fait avancer un lead dans le suivi et date le dernier contact.
 */
final class UpdateLeadStatus
{
    public function handle(Lead $lead, LeadStatus $status): Lead
    {
        if ($lead->status === $status) {
            return $lead;
        }

        $lead->status = $status;

        if ($status !== LeadStatus::Todo) {
            $lead->last_contacted_at = now();
        }

        $lead->save();

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a passé le lead {$lead->fullName()} en « {$status->label()} »"));

        return $lead;
    }
}
