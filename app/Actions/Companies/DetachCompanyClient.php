<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\Lead;
use App\Models\User;

/**
 * Détache un dossier client de son entreprise. Sans effet s'il n'y était pas.
 */
final class DetachCompanyClient
{
    public function handle(Company $company, Lead $lead, ?User $by = null): void
    {
        if ($lead->company_id !== $company->id) {
            return;
        }

        $lead->company_id = null;
        $lead->save();
        $lead->notes()->create(['body' => "Dossier détaché de l'entreprise {$company->name}.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('companies', ['id' => $company->id, 'lead_id' => $lead->id], "a détaché le dossier de {$lead->householdName()} de l'entreprise {$company->name}", $by));
    }
}
