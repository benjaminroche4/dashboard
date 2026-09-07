<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Events\DashboardUpdated;
use App\Models\Agency;

/**
 * Supprime une agence ; ses agents restent, détachés.
 */
final class DeleteAgency
{
    public function handle(Agency $agency): void
    {
        $id = $agency->id;
        $name = $agency->name;

        $agency->delete();

        event(new DashboardUpdated('agencies', ['id' => $id, 'deleted' => true], "a supprimé l'agence {$name}"));
    }
}
