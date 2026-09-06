<?php

declare(strict_types=1);

namespace App\Actions\Settings;

use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Supprime la photo de profil d'un membre du staff et son fichier.
 */
final class RemoveProfileAvatar
{
    public function handle(User $user): User
    {
        $previous = $user->avatar_path;

        if ($previous === null) {
            return $user;
        }

        $user->forceFill(['avatar_path' => null])->save();

        Storage::disk(UpdateProfileAvatar::DISK)->delete($previous);

        event(new DashboardUpdated('staff', ['id' => $user->id], 'a retiré sa photo de profil'));

        return $user;
    }
}
