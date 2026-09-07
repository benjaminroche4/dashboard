<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Data\AgentData;
use App\Events\DashboardUpdated;
use App\Models\Agent;
use App\Models\User;

/**
 * Enregistre un agent immobilier.
 */
final class CreateAgent
{
    public function handle(AgentData $data, ?User $by = null): Agent
    {
        $agent = Agent::query()->create([...$data->toArray(), 'created_by' => $by?->id]);

        event(new DashboardUpdated('agents', ['id' => $agent->id], "a ajouté l'agent {$agent->fullName()}"));

        return $agent;
    }
}
