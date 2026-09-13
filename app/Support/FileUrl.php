<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Adresse d'un fichier stocké : en local, l'URL publique de `/storage` ; dans un
 * bucket, une **URL signée temporaire**. Les buckets du projet interdisent tout
 * accès public (`public_access_prevention`) : les photos des biens, les portraits
 * de l'équipe et les photos de compte rendu ne sont donc jamais lisibles par une
 * adresse devinable, seulement par un lien signé que le backoffice fabrique à
 * chaque affichage.
 */
final class FileUrl
{
    /** Durée de validité d'un lien signé : le temps d'une session de travail. */
    public const int HOURS = 6;

    public static function for(string $disk, ?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $storage = Storage::disk($disk);

        if (config("filesystems.disks.{$disk}.driver") !== 's3') {
            return $storage->url($path);
        }

        return $storage->temporaryUrl($path, now()->addHours(self::HOURS));
    }

    /**
     * @param  list<string>  $paths
     * @return list<string>
     */
    public static function all(string $disk, array $paths): array
    {
        return array_values(array_filter(array_map(
            fn (string $path): ?string => self::for($disk, $path),
            $paths,
        )));
    }
}
