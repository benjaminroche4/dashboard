<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;

/**
 * Retire un bien d'un dossier client (le bien reste dans l'annuaire, les visites aussi).
 */
final class DetachClientProperty
{
    public function handle(Lead $lead, Property $property, ?User $by = null): void
    {
        if ($lead->properties()->detach($property->id) === 0) {
            return;
        }

        event(new DashboardUpdated('clients', ['id' => $lead->id], "a retiré le bien {$property->label()} du dossier de {$lead->fullName()}", $by));
    }
}
