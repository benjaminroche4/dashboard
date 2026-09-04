<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Data\LeadData;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Enregistre un lead saisi dans la Converting Machine.
 */
final class CreateLead
{
    public function handle(LeadData $data, ?User $by = null): Lead
    {
        $lead = Lead::query()->create([
            ...$data->toArray(),
            'status' => LeadStatus::Todo,
            'created_by' => $by?->id,
        ]);

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a ajouté le lead {$lead->fullName()}"));

        return $lead;
    }
}
