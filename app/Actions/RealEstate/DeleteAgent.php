<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Events\DashboardUpdated;
use App\Models\Agent;

/**
 * Supprime un agent immobilier.
 */
final class DeleteAgent
{
    public function handle(Agent $agent): void
    {
        $id = $agent->id;
        $name = $agent->fullName();

        $agent->delete();

        event(new DashboardUpdated('agents', ['id' => $id, 'deleted' => true], "a supprimé l'agent {$name}"));
    }
}
