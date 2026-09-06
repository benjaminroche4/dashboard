<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Lead;

/**
 * Supprime définitivement un lead, ses notes et son historique.
 */
final class DeleteLead
{
    public function handle(Lead $lead): void
    {
        $name = $lead->fullName();
        $id = $lead->id;

        $lead->notes()->delete();
        $lead->statusChanges()->delete();
        $lead->delete();

        event(new DashboardUpdated('leads', ['id' => $id, 'deleted' => true], "a supprimé le lead {$name}"));
    }
}
