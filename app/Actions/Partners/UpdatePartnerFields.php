<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Events\DashboardUpdated;
use App\Http\Requests\Partners\UpdatePartnerFieldsRequest;
use App\Models\Partner;

/**
 * Écrit les champs d'un partenaire modifiés en place depuis sa fiche : une
 * chaîne vide vaut null, une nouvelle adresse est géocodée ; rien n'est
 * enregistré ni diffusé sans changement.
 */
final readonly class UpdatePartnerFields
{
    public function __construct(private GeocodeDirectoryEntry $geocode) {}

    /**
     * @param  array<string, mixed>  $fields  Clés parmi `UpdatePartnerFieldsRequest::FIELDS`.
     */
    public function handle(Partner $partner, array $fields): Partner
    {
        $clean = [];

        foreach (array_intersect_key($fields, UpdatePartnerFieldsRequest::FIELDS) as $key => $value) {
            $clean[$key] = match (true) {
                is_string($value) && trim($value) === '' => null,
                is_string($value) => trim($value),
                default => $value,
            };
        }

        $partner->fill($clean);

        if (! $partner->isDirty()) {
            return $partner;
        }

        // Rue, code postal et ville partagent un libellé : une seule mention.
        $changed = array_values(array_unique(array_map(
            fn (string $key): string => UpdatePartnerFieldsRequest::FIELDS[$key],
            array_keys(array_intersect_key($partner->getDirty(), UpdatePartnerFieldsRequest::FIELDS)),
        )));
        $partner->save();

        if ($this->geocode->shouldGeocode($partner)) {
            $this->geocode->handle($partner);
        }

        event(new DashboardUpdated(
            'partners',
            ['id' => $partner->id],
            'a modifié '.implode(', ', $changed)." du partenaire {$partner->name}",
        ));

        return $partner;
    }
}
