<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Enums\PropertyStatus;
use App\Events\DashboardUpdated;
use App\Models\Property;
use App\Models\User;

/**
 * Change la disponibilité d'un bien depuis sa fiche ou l'annuaire, sans passer
 * par le formulaire complet. Sans changement, rien n'est diffusé.
 */
final class SetPropertyStatus
{
    public function handle(Property $property, PropertyStatus $status, ?User $by = null): Property
    {
        if ($property->status === $status) {
            return $property;
        }

        $property->forceFill(['status' => $status])->save();

        event(new DashboardUpdated('properties', ['id' => $property->id], "a passé le bien {$property->label()} en « {$status->label()} »", $by));

        return $property;
    }
}
