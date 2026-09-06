<?php

declare(strict_types=1);

namespace App\Actions\Settings;

use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Remplace la photo de profil d'un membre du staff sur le disque public.
 */
final class UpdateProfileAvatar
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'avatars';

    public function handle(User $user, UploadedFile $photo): User
    {
        $previous = $user->avatar_path;

        $path = $photo->store(self::DIRECTORY, self::DISK);

        throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer la photo de profil.');

        $user->forceFill(['avatar_path' => $path])->save();

        if ($previous !== null && $previous !== $path) {
            Storage::disk(self::DISK)->delete($previous);
        }

        event(new DashboardUpdated('staff', ['id' => $user->id], 'a changé sa photo de profil'));

        return $user;
    }
}
