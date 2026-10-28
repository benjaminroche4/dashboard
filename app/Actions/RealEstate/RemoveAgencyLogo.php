<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Retire le logo d'une agence et son fichier du disque.
 */
final class RemoveAgencyLogo
{
    public function handle(Agency $agency, ?User $by = null): Agency
    {
        $previous = $agency->logo_path;

        if ($previous === null) {
            return $agency;
        }

        $agency->forceFill(['logo_path' => null])->save();

        Storage::disk(UpdateAgencyLogo::DISK)->delete($previous);

        event(new DashboardUpdated('agencies', ['id' => $agency->id], "a retiré le logo de l'agence {$agency->name}", $by));

        return $agency;
    }
}
