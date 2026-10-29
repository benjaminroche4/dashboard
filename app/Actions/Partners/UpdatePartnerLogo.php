<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Remplace le logo d'un partenaire sur le disque public, et efface l'ancien.
 */
final class UpdatePartnerLogo
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'partner-logos';

    public function handle(Partner $partner, UploadedFile $logo, ?User $by = null): Partner
    {
        $previous = $partner->logo_path;
        $path = $logo->store(self::DIRECTORY, self::DISK);

        throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer le logo.');

        $partner->forceFill(['logo_path' => $path])->save();

        if ($previous !== null && $previous !== $path) {
            Storage::disk(self::DISK)->delete($previous);
        }

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a changé le logo du partenaire {$partner->name}", $by));

        return $partner;
    }
}
