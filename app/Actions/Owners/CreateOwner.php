<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Data\OwnerData;
use App\Events\DashboardUpdated;
use App\Models\Owner;
use App\Models\User;

/**
 * Enregistre un propriétaire à prospecter.
 */
final class CreateOwner
{
    public function handle(OwnerData $data, ?User $by = null): Owner
    {
        $owner = Owner::query()->create([...$data->toArray(), 'created_by' => $by?->id]);

        event(new DashboardUpdated('owners', ['id' => $owner->id], "a ajouté le propriétaire {$owner->fullName()}"));

        return $owner;
    }
}
