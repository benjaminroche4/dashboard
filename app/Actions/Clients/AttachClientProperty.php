<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;

/**
 * Rattache un bien de l'annuaire à un dossier client. Sans effet s'il l'est déjà.
 */
final class AttachClientProperty
{
    public function handle(Lead $lead, Property $property, ?User $by = null): void
    {
        if ($lead->properties()->whereKey($property->id)->exists()) {
            return;
        }

        $lead->properties()->attach($property->id, ['created_by' => $by?->id]);
        $lead->notes()->create(['body' => "Bien rattaché au dossier : {$property->label()}.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('clients', ['id' => $lead->id], "a rattaché le bien {$property->label()} au dossier de {$lead->fullName()}", $by));
    }
}
