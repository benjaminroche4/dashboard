<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Data\AgencyProfileData;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;

/** Enregistre le profil de matching d'une agence (saisi à la main sur sa fiche). */
final class UpdateAgencyProfile
{
    public function handle(Agency $agency, AgencyProfileData $data, ?User $by = null): Agency
    {
        $agency->fill($data->toArray());

        if ($agency->isDirty()) {
            $agency->save();
            event(new DashboardUpdated('agencies', ['id' => $agency->id], "a complété le profil de l'agence {$agency->name}", $by));
        }

        return $agency;
    }
}
