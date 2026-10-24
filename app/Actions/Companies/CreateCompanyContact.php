<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Data\CompanyContactData;
use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\CompanyContact;
use App\Models\User;

/**
 * Ajoute un contact à une entreprise. Plusieurs contacts peuvent être
 * principaux : rien n'est retiré aux autres.
 */
final class CreateCompanyContact
{
    public function handle(Company $company, CompanyContactData $data, ?User $by = null): CompanyContact
    {
        $contact = $company->contacts()->create($data->toArray());

        event(new DashboardUpdated('companies', ['id' => $company->id], "a ajouté {$contact->fullName()} chez {$company->name}", $by));

        return $contact;
    }
}
