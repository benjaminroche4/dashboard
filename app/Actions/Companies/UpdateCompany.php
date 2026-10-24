<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Data\CompanyData;
use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\User;

/**
 * Modifie une entreprise.
 */
final class UpdateCompany
{
    public function handle(Company $company, CompanyData $data, ?User $by = null): Company
    {
        $company->fill($data->toArray())->save();

        event(new DashboardUpdated('companies', ['id' => $company->id], "a modifié l'entreprise {$company->name}", $by));

        return $company;
    }
}
