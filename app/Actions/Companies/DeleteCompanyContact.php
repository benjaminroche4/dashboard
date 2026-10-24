<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Events\DashboardUpdated;
use App\Models\CompanyContact;
use App\Models\User;

/**
 * Retire un contact d'une entreprise.
 */
final class DeleteCompanyContact
{
    public function handle(CompanyContact $contact, ?User $by = null): void
    {
        $contact->loadMissing('company');
        $name = $contact->fullName();
        $company = $contact->company;

        $contact->delete();

        event(new DashboardUpdated('companies', ['id' => $company->id], "a retiré {$name} de chez {$company->name}", $by));
    }
}
