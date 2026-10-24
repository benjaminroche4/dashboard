<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Data\CompanyContactData;
use App\Events\DashboardUpdated;
use App\Models\CompanyContact;
use App\Models\User;

/**
 * Modifie un contact d'entreprise.
 */
final class UpdateCompanyContact
{
    public function handle(CompanyContact $contact, CompanyContactData $data, ?User $by = null): CompanyContact
    {
        $contact->fill($data->toArray())->save();
        $contact->loadMissing('company');

        event(new DashboardUpdated('companies', ['id' => $contact->company_id], "a modifié {$contact->fullName()} chez {$contact->company->name}", $by));

        return $contact;
    }
}
