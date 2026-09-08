<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Events\DashboardUpdated;
use App\Models\Visit;

/**
 * Supprime une visite (le bien reste dans l'annuaire).
 */
final class DeleteVisit
{
    public function handle(Visit $visit): void
    {
        $visit->loadMissing('lead');
        $id = $visit->id;
        $name = $visit->lead->fullName();

        $visit->delete();

        event(new DashboardUpdated('visits', ['id' => $id, 'deleted' => true], "a supprimé une visite de {$name}"));
    }
}
