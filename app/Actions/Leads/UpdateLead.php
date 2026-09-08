<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Data\LeadData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use Illuminate\Support\Arr;

/**
 * Met à jour les informations d'un lead (statut et position inchangés).
 */
final class UpdateLead
{
    public function handle(Lead $lead, LeadData $data): Lead
    {
        // La référence du site (CT-…) est posée à l'import et ne se modifie jamais :
        // la garder assure l'idempotence du webhook après une édition manuelle.
        $lead->fill(Arr::except($data->toArray(), ['external_reference']))->save();

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a modifié le lead {$lead->fullName()}"));

        return $lead;
    }
}
