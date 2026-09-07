<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Data\AgencyData;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;

/**
 * Enregistre une agence immobilière partenaire.
 */
final class CreateAgency
{
    public function handle(AgencyData $data, ?User $by = null): Agency
    {
        $agency = Agency::query()->create([...$data->toArray(), 'created_by' => $by?->id]);

        event(new DashboardUpdated('agencies', ['id' => $agency->id], "a ajouté l'agence {$agency->name}"));

        return $agency;
    }
}
