<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Empreinte d'une adresse de bien, pour reconnaître deux saisies du même
 * logement : « 53, rue Christelle Lefort » et « 53 rue Christelle-Lefort »
 * donnent la même clé.
 */
final class PropertyAddress
{
    /** Clé comparable d'une adresse ; null si la rue est vide. */
    public static function key(?string $street, ?string $postalCode = null, ?string $city = null): ?string
    {
        $normalized = self::normalize($street);

        if ($normalized === '') {
            return null;
        }

        return implode('|', [$normalized, self::normalize($postalCode), self::normalize($city)]);
    }

    /** Minuscules sans accent ni ponctuation, espaces réduits à un seul. */
    private static function normalize(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        $ascii = str_replace(["'", '’'], ' ', $value);
        $ascii = (string) transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $ascii);
        $ascii = (string) preg_replace('/[^a-z0-9]+/', ' ', $ascii);

        return trim((string) preg_replace('/\s+/', ' ', $ascii));
    }
}
