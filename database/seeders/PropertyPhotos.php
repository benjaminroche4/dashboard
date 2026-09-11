<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Property;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Photos de démonstration des biens : sans elles, les vignettes des listes et
 * la couverture des cartes ne montrent jamais que la silhouette de repli.
 * Images générées (dégradé + numéro), jamais téléchargées.
 */
final class PropertyPhotos
{
    /** Teintes des dégradés, une par bien. */
    private const array TONES = [
        [0xE2, 0xE8, 0xF0],
        [0xFE, 0xE2, 0xE2],
        [0xDC, 0xFC, 0xE7],
        [0xFE, 0xF3, 0xC7],
        [0xE0, 0xE7, 0xFF],
        [0xF3, 0xE8, 0xFF],
    ];

    /**
     * Attache `$count` photos au bien et renvoie les chemins enregistrés.
     *
     * @return list<string>
     */
    public static function attach(Property $property, int $count = 2): array
    {
        $paths = [];

        for ($index = 0; $index < $count; $index++) {
            $path = "properties/{$property->uuid}-".Str::random(8).'.jpg';
            Storage::disk('public')->put($path, self::image($property->label(), $index));
            $paths[] = $path;
        }

        $property->forceFill(['photos' => $paths])->save();

        return $paths;
    }

    /**
     * Une composante de couleur, bornée à l'intervalle attendu par GD.
     *
     * @return int<0, 255>
     */
    private static function channel(float $value): int
    {
        $channel = (int) $value;

        if ($channel < 0) {
            return 0;
        }

        return $channel > 255 ? 255 : $channel;
    }

    /** Vignette 800×600 : dégradé de la teinte du bien et numéro de la photo. */
    private static function image(string $label, int $index): string
    {
        $width = 800;
        $height = 600;
        $canvas = imagecreatetruecolor($width, $height);
        [$red, $green, $blue] = self::TONES[(abs(crc32($label)) + $index) % count(self::TONES)];

        for ($y = 0; $y < $height; $y++) {
            $shade = 1 - ($y / $height) * 0.35;
            $line = imagecolorallocate(
                $canvas,
                self::channel($red * $shade),
                self::channel($green * $shade),
                self::channel($blue * $shade),
            );
            if ($line !== false) {
                imagefilledrectangle($canvas, 0, $y, $width, $y, $line);
            }
        }

        $ink = imagecolorallocate($canvas, 0x44, 0x44, 0x44);

        if ($ink !== false) {
            imagestring($canvas, 5, 24, $height - 40, 'Photo '.($index + 1).' - '.mb_substr($label, 0, 40), $ink);
        }

        ob_start();
        imagejpeg($canvas, null, 80);
        $bytes = (string) ob_get_clean();
        imagedestroy($canvas);

        return $bytes;
    }
}
