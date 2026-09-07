<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

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

        event(new DashboardUpdated('agents', ['id' => $agent->id], "a modifié l'agent {$agent->fullName()}"));

        return $agent;
    }
}
