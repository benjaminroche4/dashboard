<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Events\DashboardUpdated;
use App\Models\Owner;

/**
 * Supprime un propriétaire (le lead éventuellement créé est conservé).
 */
final class DeleteOwner
{
    public function handle(Owner $owner): void
    {
        $id = $owner->id;
        $name = $owner->fullName();

        $owner->delete();

        event(new DashboardUpdated('owners', ['id' => $id, 'deleted' => true], "a supprimé le propriétaire {$name}"));
    }
}
