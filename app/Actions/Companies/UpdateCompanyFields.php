<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Events\DashboardUpdated;
use App\Http\Requests\Companies\UpdateCompanyFieldsRequest;
use App\Models\Company;

/**
 * Écrit les champs d'une entreprise modifiés en place depuis sa fiche : une
 * chaîne vide vaut null ; rien n'est enregistré ni diffusé sans changement.
 */
final readonly class UpdateCompanyFields
{
    public function __construct(private GeocodeDirectoryEntry $geocode) {}

    /**
     * @param  array<string, mixed>  $fields  Clés parmi `UpdateCompanyFieldsRequest::FIELDS`.
     */
    public function handle(Company $company, array $fields): Company
    {
        $clean = [];

        foreach (array_intersect_key($fields, UpdateCompanyFieldsRequest::FIELDS) as $key => $value) {
            $clean[$key] = match (true) {
                is_string($value) && trim($value) === '' => null,
                is_string($value) => trim($value),
                default => $value,
            };
        }

        $company->fill($clean);

        if (! $company->isDirty()) {
            return $company;
        }

        // Rue, code postal et ville partagent un libellé : une seule mention.
        $changed = array_values(array_unique(array_map(
            fn (string $key): string => UpdateCompanyFieldsRequest::FIELDS[$key],
            array_keys(array_intersect_key($company->getDirty(), UpdateCompanyFieldsRequest::FIELDS)),
        )));
        $company->save();

        if ($this->geocode->shouldGeocode($company)) {
            $this->geocode->handle($company);
        }

        event(new DashboardUpdated(
            'companies',
            ['id' => $company->id],
            'a modifié '.implode(', ', $changed)." de l'entreprise {$company->name}",
        ));

        return $company;
    }
}
