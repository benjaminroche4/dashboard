<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Events\DashboardUpdated;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Remplace la photo d'un propriétaire sur le disque public, et efface l'ancien.
 */
final class UpdateOwnerPhoto
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'owner-photos';

    public function handle(Owner $owner, UploadedFile $photo, ?User $by = null): Owner
    {
        $previous = $owner->photo_path;

        $path = $photo->store(self::DIRECTORY, self::DISK);

        throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer le logo.');

        $owner->forceFill(['photo_path' => $path])->save();

        if ($previous !== null && $previous !== $path) {
            Storage::disk(self::DISK)->delete($previous);
        }

        event(new DashboardUpdated('owners', ['id' => $owner->id], "a changé la photo du propriétaire {$owner->fullName()}", $by));

        return $owner;
    }
}
