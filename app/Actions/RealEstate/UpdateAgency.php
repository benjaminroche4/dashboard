<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Data\AgencyData;
use App\Events\DashboardUpdated;
use App\Models\Agency;

/**
 * Modifie les coordonnées d'une agence.
 */
final class UpdateAgency
{
    public function handle(Agency $agency, AgencyData $data): Agency
    {
        $agency->fill($data->toArray())->save();

        event(new DashboardUpdated('agencies', ['id' => $agency->id], "a modifié l'agence {$agency->name}"));

        return $agency;
    }
}
