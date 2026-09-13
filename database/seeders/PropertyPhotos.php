<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Property;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Photos de démonstration des biens : sans elles, les vignettes des listes et
 * la couverture des cartes ne montrent jamais que la silhouette de repli.
 * Les fichiers viennent de `database/seeders/fixtures/properties` (de vraies
 * photos de logements, versionnées avec le dépôt) et sont recopiés sur le
 * disque `public` : aucun téléchargement, le jeu de démonstration se rejoue
 * hors ligne.
 */
final class PropertyPhotos
{
    /** Photos disponibles, dans l'ordre où elles sont distribuées. */
    private const array FILES = [
        'maison-moderne.jpg',
        'villa-moderne.jpg',
        'maison-bois-jardin.jpg',
        'pavillon-terrasse.jpg',
    ];

    /**
     * Attache `$count` photos au bien et renvoie les chemins enregistrés.
     * Chaque bien part d'une photo différente (déduite de son nom) : deux
     * biens voisins n'ont donc pas la même couverture.
     *
     * @return list<string>
     */
    public static function attach(Property $property, int $count = 3): array
    {
        $files = self::FILES;
        $offset = abs(crc32($property->label())) % count($files);
        $paths = [];

        for ($index = 0; $index < min($count, count($files)); $index++) {
            $file = $files[($offset + $index) % count($files)];
            $path = "properties/{$property->uuid}-".Str::random(8).'.jpg';
            Storage::disk('public')->put($path, self::bytes($file));
            $paths[] = $path;
        }

        $property->forceFill(['photos' => $paths])->save();

        return $paths;
    }

    /** Contenu d'une photo de démonstration, lu une seule fois par exécution. */
    private static function bytes(string $file): string
    {
        /** @var array<string, string> $cache */
        static $cache = [];

        if (! isset($cache[$file])) {
            $path = __DIR__.'/fixtures/properties/'.$file;
            $bytes = is_file($path) ? file_get_contents($path) : false;

            throw_if($bytes === false, RuntimeException::class, "Photo de démonstration introuvable : {$file}");

            $cache[$file] = $bytes;
        }

        return $cache[$file];
    }
}
