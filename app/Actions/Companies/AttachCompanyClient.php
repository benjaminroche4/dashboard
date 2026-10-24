<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\Lead;
use App\Models\User;

/**
 * Rattache un dossier client à une entreprise. Un dossier n'appartient qu'à
 * une entreprise à la fois : un rattachement remplace le précédent. La raison
 * sociale du lead est renseignée si elle manquait.
 */
final class AttachCompanyClient
{
    public function handle(Company $company, Lead $lead, ?User $by = null): void
    {
        if ($lead->company_id === $company->id) {
            return;
        }

        $lead->company_id = $company->id;

        if ($lead->company === null || trim($lead->company) === '') {
            $lead->company = $company->name;
        }

        $lead->save();
        $lead->notes()->create(['body' => "Dossier rattaché à l'entreprise {$company->name}.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('companies', ['id' => $company->id, 'lead_id' => $lead->id], "a rattaché le dossier de {$lead->householdName()} à l'entreprise {$company->name}", $by));
    }
}
