<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Events\DashboardUpdated;
use App\Models\LeadWatcher;
use App\Models\User;

/** Retire une personne de suivi : elle ne reçoit plus les e-mails du dossier. */
final class DeleteClientWatcher
{
    public function handle(LeadWatcher $watcher, ?User $by = null): void
    {
        $lead = $watcher->lead;
        $name = $watcher->name;

        $watcher->delete();

        $lead->notes()->create(['body' => "Personne de suivi retirée : {$name}.", 'user_id' => $by?->id]);
        event(new DashboardUpdated('clients', ['id' => $lead->id], "a retiré {$name} du suivi du dossier {$lead->householdName()}", $by));
    }
}
