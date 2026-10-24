<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Supprime une entreprise et son logo du disque. Ses contacts partent avec
 * elle, les dossiers clients rattachés restent et perdent seulement le lien.
 */
final class DeleteCompany
{
    public function handle(Company $company, ?User $by = null): void
    {
        $id = $company->id;
        $name = $company->name;
        $logo = $company->logo_path;

        $company->delete();

        if ($logo !== null) {
            Storage::disk(UpdateCompanyLogo::DISK)->delete($logo);
        }

        event(new DashboardUpdated('companies', ['id' => $id, 'deleted' => true], "a supprimé l'entreprise {$name}", $by));
    }
}
