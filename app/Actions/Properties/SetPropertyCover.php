<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Events\DashboardUpdated;
use App\Models\Property;
use App\Models\User;

/**
 * Choisit la photo principale d'un bien : elle passe en tête de `photos`,
 * l'ordre des autres est conservé. C'est cette première photo que montrent la
 * carte de l'annuaire, le sélecteur de bien d'une visite et la fiche.
 */
final class SetPropertyCover
{
    public function handle(Property $property, int $index, ?User $by = null): Property
    {
        $photos = $property->photos ?? [];

        if (! array_key_exists($index, $photos) || $index === 0) {
            return $property;
        }

        $cover = $photos[$index];
        unset($photos[$index]);

        $property->forceFill(['photos' => [$cover, ...array_values($photos)]])->save();

        event(new DashboardUpdated('properties', ['id' => $property->id], "a changé la photo principale du bien {$property->label()}", $by));

        return $property;
    }
}
