<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Comparaison de numéros de téléphone saisis librement (« +33 6 12… », « 0612… »).
 */
final class PhoneNumber
{
    /** Chiffres seuls. */
    public static function digits(string $value): string
    {
        return preg_replace('/\D+/', '', $value) ?? '';
    }

    /**
     * Les neuf derniers chiffres (numéro national sans indicatif ni zéro initial),
     * chaîne vide si le numéro est trop court pour être comparé.
     */
    public static function suffix(string $value): string
    {
        $digits = self::digits($value);

        return strlen($digits) >= 6 ? substr($digits, -9) : '';
    }

    /**
     * Numéro au format E.164 (« +33612345678 ») à partir d'une saisie libre : « +33 6 12… »,
     * « 0033 6… » ou « 06… » (un numéro national sans indicatif est supposé français).
     * Null si le numéro est trop court ou trop long pour être valide.
     */
    public static function e164(?string $value): ?string
    {
        $raw = trim((string) $value);
        $digits = self::digits($raw);

        if (str_starts_with($raw, '+')) {
            $international = $digits;
        } elseif (str_starts_with($digits, '00')) {
            $international = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $international = '33'.substr($digits, 1);
        } else {
            $international = $digits;
        }

        $length = strlen($international);

        return $length >= 8 && $length <= 15 ? '+'.$international : null;
    }

    public static function matches(?string $a, ?string $b): bool
    {
        $suffix = self::suffix((string) $a);

        return $suffix !== '' && $suffix === self::suffix((string) $b);
    }
}
