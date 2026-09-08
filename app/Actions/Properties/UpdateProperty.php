<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Data\PropertyData;
use App\Events\DashboardUpdated;
use App\Models\Property;

/**
 * Modifie un bien de l'annuaire.
 */
final readonly class UpdateProperty
{
    public function __construct(private GeocodeProperty $geocode) {}

    public function handle(Property $property, PropertyData $data): Property
    {
        $property->fill($data->toArray());
        $addressChanged = $property->isDirty(['street', 'postal_code', 'city']);
        $property->save();

        if ($addressChanged || $property->latitude === null) {
            $this->geocode->handle($property);
        }

        event(new DashboardUpdated('properties', ['id' => $property->id], "a modifié le bien {$property->label()}"));

        return $property;
    }
}
