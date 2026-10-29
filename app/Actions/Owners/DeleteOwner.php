<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Events\DashboardUpdated;
use App\Models\Owner;
use Illuminate\Support\Facades\Storage;

/**
 * Supprime un propriétaire et sa photo du disque (le lead éventuellement
 * créé est conservé).
 */
final class DeleteOwner
{
    public function handle(Owner $owner): void
    {
        $id = $owner->id;
        $name = $owner->fullName();
        $photo = $owner->photo_path;

        $owner->delete();

        if ($photo !== null) {
            Storage::disk(UpdateOwnerPhoto::DISK)->delete($photo);
        }

        event(new DashboardUpdated('owners', ['id' => $id, 'deleted' => true], "a supprimé le propriétaire {$name}"));
    }
}
