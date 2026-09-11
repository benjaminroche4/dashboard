<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Events\DashboardUpdated;
use App\Models\Owner;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Note la date du dernier échange avec un propriétaire, comme pour les agents
 * et les partenaires : sans elle, rien ne dit lequel n'a pas été rappelé.
 */
final class TouchOwnerContact
{
    public function handle(Owner $owner, ?CarbonImmutable $at = null, ?User $by = null): Owner
    {
        $owner->last_contacted_at = $at ?? CarbonImmutable::now();
        $owner->save();

        event(new DashboardUpdated('owners', ['id' => $owner->id], "a noté un échange avec {$owner->fullName()}", $by));

        return $owner;
    }
}
