<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Remplace le logo d'une agence sur le disque public, et efface l'ancien.
 */
final class UpdateAgencyLogo
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'agency-logos';

    public function handle(Agency $agency, UploadedFile $logo, ?User $by = null): Agency
    {
        $previous = $agency->logo_path;

        $path = $logo->store(self::DIRECTORY, self::DISK);

        throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer le logo.');

        $agency->forceFill(['logo_path' => $path])->save();

        if ($previous !== null && $previous !== $path) {
            Storage::disk(self::DISK)->delete($previous);
        }

        event(new DashboardUpdated('agencies', ['id' => $agency->id], "a changé le logo de l'agence {$agency->name}", $by));

        return $agency;
    }
}
