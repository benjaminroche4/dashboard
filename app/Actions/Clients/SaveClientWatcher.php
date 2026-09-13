<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Data\LeadWatcherData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadWatcher;
use App\Models\User;

/**
 * Ajoute ou met à jour une personne de suivi du dossier : quelqu'un à qui on
 * met une adresse pour qu'il reçoive une copie des e-mails.
 */
final class SaveClientWatcher
{
    public function handle(Lead $lead, LeadWatcherData $data, ?LeadWatcher $watcher = null, ?User $by = null): LeadWatcher
    {
        $adding = ! $watcher instanceof LeadWatcher;

        if ($adding) {
            $watcher = $lead->watchers()->create([...$data->toArray(), 'created_by' => $by?->id]);
        } else {
            $watcher->fill($data->toArray())->save();
        }

        $lead->notes()->create([
            'body' => $adding
                ? "Personne de suivi ajoutée : {$watcher->name} ({$watcher->email})."
                : "Personne de suivi mise à jour : {$watcher->name} ({$watcher->email}).",
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated(
            'clients',
            ['id' => $lead->id],
            $adding
                ? "a ajouté {$watcher->name} au suivi du dossier {$lead->householdName()}"
                : "a mis à jour {$watcher->name} dans le suivi du dossier {$lead->householdName()}",
            $by,
        ));

        return $watcher;
    }
}
