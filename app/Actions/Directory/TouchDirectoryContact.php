<?php

declare(strict_types=1);

namespace App\Actions\Directory;

use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Note la date du dernier échange avec une agence ou un agent, pour repérer
 * ceux que l'équipe n'a pas appelés depuis longtemps.
 */
final class TouchDirectoryContact
{
    public function handle(Agency|Agent $entry, ?CarbonImmutable $at = null, ?User $by = null): Agency|Agent
    {
        $at ??= CarbonImmutable::now();
        $entry->last_contacted_at = $at;
        $entry->save();

        $name = $entry instanceof Agent ? $entry->fullName() : $entry->name;
        $resource = $entry instanceof Agent ? 'agents' : 'agencies';

        // Le payload marque l'échange et sa date : la modale « Voir
        // l'historique » des fiches relit le journal pour les lister.
        event(new DashboardUpdated($resource, ['id' => $entry->id, 'kind' => ListContactHistory::KIND, 'at' => $at->toIso8601String()], "a noté un échange avec {$name}", $by));

        return $entry;
    }
}
