<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Enums\PropertyApplicationStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;

/**
 * Suite donnée à un bien visité : le client se positionne ou non, puis sa
 * candidature aboutit ou non. Un bien décidé depuis la fiche d'une visite peut
 * ne pas encore être rattaché au dossier : le lien est alors créé.
 */
final class SetClientPropertyStatus
{
    public function handle(Lead $lead, Property $property, PropertyApplicationStatus $status, ?User $by = null): void
    {
        $linked = $lead->properties()->whereKey($property->id)->exists();

        if (! $linked) {
            $lead->properties()->attach($property->id, ['created_by' => $by?->id]);
        }

        $lead->properties()->updateExistingPivot($property->id, [
            'status' => $status->value,
            'status_at' => $status === PropertyApplicationStatus::Pending ? null : now(),
            // Le compteur de relance repart : un bien remis « À décider » sera
            // rappelé de nouveau, un bien tranché ne l'est plus.
            'decision_reminded_at' => null,
        ]);

        $lead->notes()->create([
            'body' => "{$property->label()} : {$status->label()}.",
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated('clients', ['id' => $lead->id], "a noté « {$status->label()} » sur le bien {$property->label()} du dossier de {$lead->fullName()}", $by));
    }
}
