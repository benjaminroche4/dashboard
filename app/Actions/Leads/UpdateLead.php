<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Data\LeadData;
use App\Events\DashboardUpdated;
use App\Models\Lead;

/**
 * Met à jour les informations d'un lead (statut et position inchangés).
 */
final class UpdateLead
{
    public function handle(Lead $lead, LeadData $data): Lead
    {
        $lead->fill($data->toArray())->save();

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a modifié le lead {$lead->fullName()}"));

        return $lead;
    }
}
