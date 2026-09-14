<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Data\AgencyProfileData;
use App\Events\DashboardUpdated;
use App\Models\Agent;
use App\Models\User;

/** Enregistre le profil de matching propre à un agent (quartiers, spécialités, langues). */
final class UpdateAgentProfile
{
    public function handle(Agent $agent, AgencyProfileData $data, ?User $by = null): Agent
    {
        $agent->fill([
            'districts' => $data->districts === [] ? null : $data->districts,
            'specialties' => $data->specialties === [] ? null : $data->specialties,
            'languages' => $data->languages === [] ? null : $data->languages,
        ]);

        if ($agent->isDirty()) {
            $agent->save();
            event(new DashboardUpdated('agents', ['id' => $agent->id], "a complété le profil de {$agent->fullName()}", $by));
        }

        return $agent;
    }
}
