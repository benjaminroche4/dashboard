<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Rapproche deux raisons sociales écrites différemment : « Nestlé S.A. »,
 * « NESTLE SA » et « nestle » désignent la même entreprise. La clé ignore la
 * casse, les accents, la ponctuation, les formes juridiques et les espaces ;
 * `similar()` tolère en plus une faute d'une ou deux lettres sur un nom assez
 * long pour que ce ne soit pas un autre mot.
 */
final class CompanyName
{
    /** Formes juridiques et mots creux retirés avant comparaison. */
    private const array NOISE = [
        'sarl', 'sas', 'sasu', 'sa', 'eurl', 'sci', 'snc', 'scp', 'selarl', 'sel', 'gmbh', 'ag', 'ltd', 'limited',
        'llc', 'inc', 'corp', 'co', 'plc', 'bv', 'nv', 'srl', 'spa', 'group', 'groupe', 'holding', 'the', 'le', 'la', 'les',
    ];

    /** Clé de comparaison : lettres et chiffres seulement, sans forme juridique. */
    public static function key(string $name): string
    {
        // Les points des sigles tombent d'abord : « S.A.R.L. » doit lire « sarl », pas quatre lettres.
        $ascii = Str::lower(Str::ascii(str_replace('.', '', trim($name))));
        $words = preg_split('/[^a-z0-9]+/', $ascii, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $kept = array_values(array_filter($words, fn (string $word): bool => ! in_array($word, self::NOISE, true)));

        // Un nom fait seulement de formes juridiques (« SA ») garde ses mots.
        return implode('', $kept === [] ? $words : $kept);
    }

    /** Vrai quand deux raisons sociales désignent vraisemblablement la même entreprise. */
    public static function similar(string $a, string $b): bool
    {
        $x = self::key($a);
        $y = self::key($b);

        if ($x === '' || $y === '') {
            return false;
        }

        if ($x === $y) {
            return true;
        }

        // Une faute de frappe sur un nom d'au moins six caractères ; deux au-delà de dix.
        $shortest = min(mb_strlen($x), mb_strlen($y));
        $tolerance = $shortest >= 10 ? 2 : ($shortest >= 6 ? 1 : 0);

        return $tolerance > 0 && levenshtein($x, $y) <= $tolerance;
    }
}
