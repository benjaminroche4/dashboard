<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Data\OwnerData;
use App\Events\DashboardUpdated;
use App\Models\Owner;

/**
 * Modifie un propriétaire de l'annuaire.
 */
final class UpdateOwner
{
    public function handle(Owner $owner, OwnerData $data): Owner
    {
        $owner->fill($data->toArray())->save();
        // Nouvelle adresse (ou position encore absente) : on repositionne sur la carte.
        $geocode = resolve(GeocodeDirectoryEntry::class);

        if ($geocode->shouldGeocode($owner)) {
            $geocode->handle($owner);
        }

        event(new DashboardUpdated('owners', ['id' => $owner->id], "a modifié le propriétaire {$owner->fullName()}"));

        return $owner;
    }
}
