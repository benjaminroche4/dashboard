<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Data\AgentData;
use App\Events\DashboardUpdated;
use App\Models\Agent;

/**
 * Modifie un agent immobilier.
 */
final class UpdateAgent
{
    public function handle(Agent $agent, AgentData $data): Agent
    {
        $agent->fill($data->toArray())->save();

        // Nouvelle adresse (ou position encore absente) : on repositionne sur la carte.
        $geocode = resolve(GeocodeDirectoryEntry::class);

        if ($geocode->shouldGeocode($agent)) {
            $geocode->handle($agent);
        }

        event(new DashboardUpdated('agents', ['id' => $agent->id], "a modifié l'agent {$agent->fullName()}"));

        return $agent;
    }
}
