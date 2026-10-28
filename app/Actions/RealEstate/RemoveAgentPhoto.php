<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Events\DashboardUpdated;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Retire la photo d'un agent et son fichier du disque.
 */
final class RemoveAgentPhoto
{
    public function handle(Agent $agent, ?User $by = null): Agent
    {
        $previous = $agent->photo_path;

        if ($previous === null) {
            return $agent;
        }

        $agent->forceFill(['photo_path' => null])->save();

        Storage::disk(UpdateAgentPhoto::DISK)->delete($previous);

        event(new DashboardUpdated('agents', ['id' => $agent->id], "a retiré la photo de l'agent {$agent->fullName()}", $by));

        return $agent;
    }
}
