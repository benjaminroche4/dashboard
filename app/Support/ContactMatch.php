<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Contrainte partagée par les scopes `matchingContact` : même e-mail
 * (insensible à la casse) ou même fin de numéro de téléphone.
 */
final class ContactMatch
{
    /** Chiffres minimum pour comparer un numéro. */
    public const int MIN_DIGITS = 6;

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     */
    public static function apply(Builder $query, ?string $email, ?string $phone): void
    {
        $email = mb_strtolower(trim((string) $email));
        $digits = PhoneNumber::digits((string) $phone);

        if ($email === '' && strlen($digits) < self::MIN_DIGITS) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where(function (Builder $query) use ($email, $digits): void {
            if ($email !== '') {
                $query->whereRaw('lower(email) = ?', [$email]);
            }

            if (strlen($digits) >= self::MIN_DIGITS) {
                // Compare les chiffres seuls : « +33 6 12 » et « 0612 » se rejoignent sur la fin.
                $query->orWhereRaw("replace(replace(replace(replace(phone, ' ', ''), '.', ''), '-', ''), '+', '') like ?", ['%'.substr($digits, -9)]);
            }
        });
    }
}
