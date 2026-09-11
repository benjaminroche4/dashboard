<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Events\DashboardUpdated;
use App\Models\LeadGuarantor;
use App\Models\User;

/** Retire un garant du dossier. */
final class DeleteClientGuarantor
{
    public function handle(LeadGuarantor $guarantor, ?User $by = null): void
    {
        $lead = $guarantor->lead;
        $name = $guarantor->fullName();

        $guarantor->delete();

        $lead->notes()->create(['body' => "Garant retiré du dossier : {$name}.", 'user_id' => $by?->id]);
        event(new DashboardUpdated('clients', ['id' => $lead->id], "a retiré le garant {$name} du dossier {$lead->householdName()}", $by));
    }
}
