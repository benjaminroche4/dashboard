<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Retire le logo d'une entreprise et son fichier du disque.
 */
final class RemoveCompanyLogo
{
    public function handle(Company $company, ?User $by = null): Company
    {
        $previous = $company->logo_path;

        if ($previous === null) {
            return $company;
        }

        $company->forceFill(['logo_path' => null])->save();

        Storage::disk(UpdateCompanyLogo::DISK)->delete($previous);

        event(new DashboardUpdated('companies', ['id' => $company->id], "a retiré le logo de l'entreprise {$company->name}", $by));

        return $company;
    }
}
