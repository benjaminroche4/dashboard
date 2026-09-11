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
        $entry->last_contacted_at = $at ?? CarbonImmutable::now();
        $entry->save();

        $name = $entry instanceof Agent ? $entry->fullName() : $entry->name;
        $resource = $entry instanceof Agent ? 'agents' : 'agencies';

        event(new DashboardUpdated($resource, ['id' => $entry->id], "a noté un échange avec {$name}", $by));

        return $entry;
    }
}
