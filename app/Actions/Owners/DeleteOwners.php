<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Events\DashboardUpdated;
use App\Models\Owner;
use Illuminate\Support\Collection;

/**
 * Supprime plusieurs propriétaires d'un coup (admins).
 */
final class DeleteOwners
{
    /**
     * @param  Collection<int, Owner>  $owners
     * @return int Nombre de propriétaires supprimés.
     */
    public function handle(Collection $owners): int
    {
        $count = 0;

        foreach ($owners as $owner) {
            $name = $owner->fullName();
            $id = $owner->id;
            $owner->delete();
            $count++;

            event(new DashboardUpdated('owners', ['id' => $id], "a supprimé le propriétaire {$name}"));
        }

        return $count;
    }
}
