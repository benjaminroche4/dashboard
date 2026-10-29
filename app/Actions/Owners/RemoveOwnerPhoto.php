<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Events\DashboardUpdated;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Retire la photo d'un propriétaire et son fichier du disque.
 */
final class RemoveOwnerPhoto
{
    public function handle(Owner $owner, ?User $by = null): Owner
    {
        $previous = $owner->photo_path;

        if ($previous === null) {
            return $owner;
        }

        $owner->forceFill(['photo_path' => null])->save();

        Storage::disk(UpdateOwnerPhoto::DISK)->delete($previous);

        event(new DashboardUpdated('owners', ['id' => $owner->id], "a retiré la photo du propriétaire {$owner->fullName()}", $by));

        return $owner;
    }
}
