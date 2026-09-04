const currencyFormatters = new Map<string, Intl.NumberFormat>();

/** Locale par devise : CHF à la suisse (1 234.50), EUR à la française (1 234,50). */
function localeFor(currency: string): string {
    return currency === 'CHF' ? 'fr-CH' : 'fr-FR';
}

export function formatMoney(cents: number, currency = 'EUR'): string {
    let formatter = currencyFormatters.get(currency);

    if (!formatter) {
        formatter = new Intl.NumberFormat(localeFor(currency), {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
        });
        currencyFormatters.set(currency, formatter);
    }

    return formatter.format(cents / 100);
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

/** « 04 sept. 2026 » à partir d'une date ISO (AAAA-MM-JJ). */
export function formatDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);

    return dateFormatter.format(new Date(year, month - 1, day));
}

const longDateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/** « 4 septembre 2026 ». Retourne une chaîne vide si la date est invalide. */
export function formatLongDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);

    if (!year || !month || !day) {
        return '';
    }

    return longDateFormatter.format(new Date(year, month - 1, day));
}
