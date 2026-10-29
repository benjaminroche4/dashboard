<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Retire le logo d'un partenaire et son fichier du disque.
 */
final class RemovePartnerLogo
{
    public function handle(Partner $partner, ?User $by = null): Partner
    {
        $previous = $partner->logo_path;

        if ($previous === null) {
            return $partner;
        }

        $partner->forceFill(['logo_path' => null])->save();
        Storage::disk(UpdatePartnerLogo::DISK)->delete($previous);

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a retiré le logo du partenaire {$partner->name}", $by));

        return $partner;
    }
}
