<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Events\DashboardUpdated;
use App\Models\Agency;
use Illuminate\Support\Facades\Storage;

/**
 * Supprime une agence et son logo du disque ; ses agents restent, détachés.
 */
final class DeleteAgency
{
    public function handle(Agency $agency): void
    {
        $id = $agency->id;
        $name = $agency->name;
        $logo = $agency->logo_path;

        $agency->delete();

        if ($logo !== null) {
            Storage::disk(UpdateAgencyLogo::DISK)->delete($logo);
        }

        event(new DashboardUpdated('agencies', ['id' => $id, 'deleted' => true], "a supprimé l'agence {$name}"));
    }
}
