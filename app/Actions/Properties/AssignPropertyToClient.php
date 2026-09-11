<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Enums\PropertyStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Attribue un bien à un client, ou le libère. Un bien attribué est pris : il
 * n'est plus proposé pour une visite ni suggéré sur un dossier.
 */
final class AssignPropertyToClient
{
    public function handle(Property $property, ?Lead $lead, ?User $by = null): Property
    {
        $before = $property->assigned_lead_id;

        if ($before === $lead?->id) {
            return $property;
        }

        $property->assigned_lead_id = $lead?->id;
        $property->assigned_at = $lead instanceof Lead ? CarbonImmutable::now() : null;

        // Le statut suit l'attribution : un bien pris n'est plus « Disponible »,
        // et le libérer le remet à disposition s'il était seulement sous option.
        if ($lead instanceof Lead && $property->status === PropertyStatus::Available) {
            $property->status = PropertyStatus::UnderOffer;
        } elseif (! $lead instanceof Lead && $property->status === PropertyStatus::UnderOffer) {
            $property->status = PropertyStatus::Available;
        }

        $property->save();

        // Le dossier garde la trace : le bien y est noté attribué puis libéré.
        if ($lead instanceof Lead) {
            $lead->notes()->create([
                'body' => "Bien attribué au dossier : {$property->label()}.",
                'user_id' => $by?->id,
            ]);
        } elseif ($before !== null) {
            Lead::query()->whereKey($before)->first()?->notes()->create([
                'body' => "Bien libéré : {$property->label()}.",
                'user_id' => $by?->id,
            ]);
        }

        event(new DashboardUpdated(
            'properties',
            ['id' => $property->id, 'lead_id' => $lead?->id],
            $lead instanceof Lead
                ? "a attribué le bien {$property->label()} à {$lead->householdName()}"
                : "a libéré le bien {$property->label()}",
            $by,
        ));

        return $property;
    }
}
