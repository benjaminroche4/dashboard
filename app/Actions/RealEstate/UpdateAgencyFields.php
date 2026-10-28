<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Events\DashboardUpdated;
use App\Http\Requests\RealEstate\UpdateAgencyFieldsRequest;
use App\Models\Agency;

/**
 * Écrit les champs d'une agence modifiés en place depuis sa fiche : une
 * chaîne ou une liste vide vaut null, un booléen reste tri-état (null = on
 * ne sait pas), une nouvelle adresse est géocodée ; rien n'est enregistré ni
 * diffusé sans changement.
 */
final readonly class UpdateAgencyFields
{
    public function __construct(private GeocodeDirectoryEntry $geocode) {}

    /**
     * @param  array<string, mixed>  $fields  Clés parmi `UpdateAgencyFieldsRequest::FIELDS`.
     */
    public function handle(Agency $agency, array $fields): Agency
    {
        $clean = [];

        foreach (array_intersect_key($fields, UpdateAgencyFieldsRequest::FIELDS) as $key => $value) {
            $clean[$key] = match (true) {
                is_string($value) && trim($value) === '' => null,
                is_string($value) => trim($value),
                is_array($value) && $value === [] => null,
                $key === 'districts' && is_array($value) => array_values(array_unique(array_map(intval(...), $value))),
                default => $value,
            };
        }

        $agency->fill($clean);

        if (! $agency->isDirty()) {
            return $agency;
        }

        // Rue, code postal et ville (comme les deux loyers) partagent un libellé : une seule mention.
        $changed = array_values(array_unique(array_map(
            fn (string $key): string => UpdateAgencyFieldsRequest::FIELDS[$key],
            array_keys(array_intersect_key($agency->getDirty(), UpdateAgencyFieldsRequest::FIELDS)),
        )));
        $agency->save();

        if ($this->geocode->shouldGeocode($agency)) {
            $this->geocode->handle($agency);
        }

        event(new DashboardUpdated(
            'agencies',
            ['id' => $agency->id],
            'a modifié '.implode(', ', $changed)." de l'agence {$agency->name}",
        ));

        return $agency;
    }
}
