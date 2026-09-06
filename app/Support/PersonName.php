<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Normalise un prénom ou un nom saisi : espaces réduits, initiale de chaque
 * mot en majuscule (y compris après un tiret ou une apostrophe), reste en
 * minuscules. « jean-pierre DE la TOUR » → « Jean-Pierre De La Tour ».
 */
final class PersonName
{
    public static function capitalize(string $value): string
    {
        $value = mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $value)));

        return (string) preg_replace_callback(
            '/(^|[\s\-\'’])(\p{L})/u',
            fn (array $match): string => $match[1].mb_strtoupper($match[2]),
            $value,
        );
    }
}
