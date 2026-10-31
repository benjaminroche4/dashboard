<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Events\DashboardUpdated;
use App\Http\Requests\Owners\UpdateOwnerFieldsRequest;
use App\Models\Owner;

/**
 * Écrit les champs d'un propriétaire modifiés en place depuis sa fiche : une
 * chaîne vide vaut null ; rien n'est enregistré ni diffusé sans changement.
 */
final readonly class UpdateOwnerFields
{
    public function __construct(private GeocodeDirectoryEntry $geocode) {}

    /**
     * @param  array<string, mixed>  $fields  Clés parmi `UpdateOwnerFieldsRequest::FIELDS`.
     */
    public function handle(Owner $owner, array $fields): Owner
    {
        $clean = [];

        foreach (array_intersect_key($fields, UpdateOwnerFieldsRequest::FIELDS) as $key => $value) {
            $clean[$key] = match (true) {
                is_string($value) && trim($value) === '' => null,
                is_string($value) => trim($value),
                default => $value,
            };
        }

        $owner->fill($clean);

        if (! $owner->isDirty()) {
            return $owner;
        }

        // Rue, code postal et ville partagent un libellé : une seule mention.
        $changed = array_values(array_unique(array_map(
            fn (string $key): string => UpdateOwnerFieldsRequest::FIELDS[$key],
            array_keys(array_intersect_key($owner->getDirty(), UpdateOwnerFieldsRequest::FIELDS)),
        )));
        $owner->save();

        if ($this->geocode->shouldGeocode($owner)) {
            $this->geocode->handle($owner);
        }

        event(new DashboardUpdated(
            'owners',
            ['id' => $owner->id],
            'a modifié '.implode(', ', $changed)." du propriétaire {$owner->fullName()}",
        ));

        return $owner;
    }
}
