<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Contracts\Database\Query\Expression;
use Illuminate\Database\Query\Expression as RawExpression;
use Illuminate\Support\Facades\DB;

/**
 * Fragments SQL de la recherche, écrits pour les deux bases du projet :
 * SQLite en local, MySQL ou Postgres sur Laravel Cloud. `||` concatène sous
 * SQLite et Postgres mais vaut un OU logique sous MySQL — une recherche par
 * nom complet y échouait en silence. Les colonnes sont fixes : PHPStan exige
 * une chaîne littérale pour une expression brute, et c'est plus sûr.
 */
final class SearchSql
{
    /** Expression « prénom nom », à passer en colonne d'un `where(…, 'like', …)`. */
    public static function fullName(): Expression
    {
        return new RawExpression(self::mysql()
            ? "concat(first_name, ' ', last_name)"
            : "first_name || ' ' || last_name");
    }

    /** Idem pour le second locataire d'un dossier. */
    public static function coFullName(): Expression
    {
        return new RawExpression(self::mysql()
            ? "concat(co_first_name, ' ', co_last_name)"
            : "co_first_name || ' ' || co_last_name");
    }

    /** Chiffres seuls de la colonne `phone`, pour comparer la fin d'un numéro. */
    public static function phoneDigits(): Expression
    {
        return new RawExpression("replace(replace(replace(replace(phone, ' ', ''), '.', ''), '-', ''), '+', '')");
    }

    /** Idem pour `co_phone`. */
    public static function coPhoneDigits(): Expression
    {
        return new RawExpression("replace(replace(replace(replace(co_phone, ' ', ''), '.', ''), '-', ''), '+', '')");
    }

    private static function mysql(): bool
    {
        return DB::connection()->getDriverName() === 'mysql';
    }
}
