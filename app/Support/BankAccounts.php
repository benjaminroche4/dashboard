<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\Currency;

/**
 * Comptes bancaires de la société, proposés sur une facture ou un devis. Une
 * société encaisse rarement sur un seul compte : le compte servi dépend de la
 * devise (et donc de la destination du virement).
 *
 * @phpstan-type Account array{label: string, bank: string, iban: string, reference: string, currency: string|null}
 */
final class BankAccounts
{
    /**
     * Tous les comptes déclarés, le compte historique en repli.
     *
     * @return list<array{label: string, bank: string, iban: string, reference: string, currency: string|null}>
     */
    public static function all(): array
    {
        $configured = config('company.accounts');

        if (is_string($configured) && $configured !== '') {
            $configured = json_decode($configured, true);
        }

        $accounts = [];

        foreach (is_array($configured) ? $configured : [] as $account) {
            if (! is_array($account) || trim((string) ($account['iban'] ?? '')) === '') {
                continue;
            }

            $currency = isset($account['currency']) ? (string) $account['currency'] : null;

            $accounts[] = [
                'label' => (string) ($account['label'] ?? $account['bank'] ?? $account['iban']),
                'bank' => (string) ($account['bank'] ?? ''),
                'iban' => (string) $account['iban'],
                'reference' => (string) ($account['reference'] ?? ''),
                'currency' => Currency::tryFrom((string) $currency) !== null ? $currency : null,
            ];
        }

        // Sans compte déclaré, le couple historique sert de repli — à condition
        // d'avoir un IBAN : une entrée vide ne serait pas un compte.
        if ($accounts === [] && trim((string) config('company.iban')) !== '') {
            $accounts[] = [
                'label' => (string) config('company.bank'),
                'bank' => (string) config('company.bank'),
                'iban' => (string) config('company.iban'),
                'reference' => '',
                'currency' => null,
            ];
        }

        return $accounts;
    }

    /**
     * Comptes utilisables pour une devise : les siens, puis ceux sans devise.
     *
     * @return list<array{label: string, bank: string, iban: string, reference: string, currency: string|null}>
     */
    public static function forCurrency(Currency $currency): array
    {
        $matching = array_values(array_filter(self::all(), fn (array $account): bool => $account['currency'] === $currency->value));
        $neutral = array_values(array_filter(self::all(), fn (array $account): bool => $account['currency'] === null));

        return [...$matching, ...$neutral];
    }

    /**
     * Compte servi par défaut pour une devise ; null si la société n'en a
     * déclaré aucun.
     *
     * @return array{label: string, bank: string, iban: string, reference: string, currency: string|null}|null
     */
    public static function default(Currency $currency): ?array
    {
        return self::forCurrency($currency)[0] ?? self::all()[0] ?? null;
    }

    /**
     * Coordonnées à imprimer : celles enregistrées sur le document, sinon le
     * compte par défaut de sa devise.
     *
     * @return array{bank: string, iban: string, reference: string}
     */
    public static function resolve(?string $bank, ?string $iban, ?string $reference, Currency $currency): array
    {
        if ($iban !== null && $iban !== '') {
            return ['bank' => $bank ?? '', 'iban' => $iban, 'reference' => $reference ?? ''];
        }

        $account = self::default($currency);

        return [
            'bank' => $account['bank'] ?? '',
            'iban' => $account['iban'] ?? '',
            'reference' => $reference ?? ($account['reference'] ?? ''),
        ];
    }
}
