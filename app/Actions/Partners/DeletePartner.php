<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Events\DashboardUpdated;
use App\Models\Partner;
use Illuminate\Support\Facades\Storage;

/**
 * Supprime un partenaire et son logo du disque.
 */
final class DeletePartner
{
    public function handle(Partner $partner): void
    {
        $id = $partner->id;
        $name = $partner->name;

        $logo = $partner->logo_path;
        $partner->delete();

        if ($logo !== null) {
            Storage::disk(UpdatePartnerLogo::DISK)->delete($logo);
        }

        event(new DashboardUpdated('partners', ['id' => $id, 'deleted' => true], "a supprimé le partenaire {$name}"));
    }
}
