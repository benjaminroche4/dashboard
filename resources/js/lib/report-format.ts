import type { Currency, CurrencyAmounts } from '@/types';

/** « 45,2 % », ou « — » sans dénominateur. */
export function formatRate(rate: number | null): string {
    return rate === null ? '—' : `${rate.toLocaleString('fr-FR')} %`;
}

/** « 12 min », « 1 h 05 », « 2 j 03 h », ou « — ». */
export function formatDelay(minutes: number | null): string {
    if (minutes === null) {
        return '—';
    }

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} h ${String(minutes % 60).padStart(2, '0')}`;
    }

    return `${Math.floor(hours / 24)} j ${String(hours % 24).padStart(2, '0')} h`;
}

/** Devises ayant au moins un montant non nul, la devise par défaut en premier. */
export function activeCurrencies(
    amounts: CurrencyAmounts[],
    preferred: Currency,
): Currency[] {
    const currencies = (Object.keys(amounts[0] ?? {}) as Currency[]).filter(
        (currency) => amounts.some((entry) => entry[currency] > 0),
    );

    return currencies.sort((a, b) =>
        a === preferred ? -1 : b === preferred ? 1 : a.localeCompare(b),
    );
}
