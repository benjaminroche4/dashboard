<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Remplace le logo d'une entreprise sur le disque public, et efface l'ancien.
 */
final class UpdateCompanyLogo
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'company-logos';

    public function handle(Company $company, UploadedFile $logo, ?User $by = null): Company
    {
        $previous = $company->logo_path;

        $path = $logo->store(self::DIRECTORY, self::DISK);

        throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer le logo.');

        $company->forceFill(['logo_path' => $path])->save();

        if ($previous !== null && $previous !== $path) {
            Storage::disk(self::DISK)->delete($previous);
        }

        event(new DashboardUpdated('companies', ['id' => $company->id], "a changé le logo de l'entreprise {$company->name}", $by));

        return $company;
    }
}
