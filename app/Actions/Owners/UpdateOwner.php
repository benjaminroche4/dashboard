<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Data\OwnerData;
use App\Enums\OwnerStatus;
use App\Events\DashboardUpdated;
use App\Models\Owner;

/**
 * Modifie un propriétaire. Passer de « À contacter » à un autre statut
 * date le dernier contact.
 */
final class UpdateOwner
{
    public function handle(Owner $owner, OwnerData $data): Owner
    {
        $touched = $owner->status === OwnerStatus::ToContact && $data->status !== OwnerStatus::ToContact;

        $owner->fill($data->toArray());

        if ($touched && $owner->last_contacted_at === null) {
            $owner->last_contacted_at = now();
        }

        $owner->save();

        event(new DashboardUpdated('owners', ['id' => $owner->id], "a modifié le propriétaire {$owner->fullName()}"));

        return $owner;
    }
}
