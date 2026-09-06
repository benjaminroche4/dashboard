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

    public static function matches(?string $a, ?string $b): bool
    {
        $suffix = self::suffix((string) $a);

        return $suffix !== '' && $suffix === self::suffix((string) $b);
    }
}
