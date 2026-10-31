<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Data\CompanyData;
use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\User;

/**
 * Enregistre une entreprise dans l'annuaire.
 */
final class CreateCompany
{
    public function handle(CompanyData $data, ?User $by = null): Company
    {
        $company = Company::query()->create([...$data->toArray(), 'created_by' => $by?->id]);
        // Position posée depuis l'adresse, pour « Voir sur la carte » (jamais bloquant).
        resolve(GeocodeDirectoryEntry::class)->handle($company);

        event(new DashboardUpdated('companies', ['id' => $company->id], "a ajouté l'entreprise {$company->name}", $by));

        return $company;
    }
}
