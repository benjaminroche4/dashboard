const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(cents: number, currency = 'EUR'): string {
    let formatter = currencyFormatters.get(currency);

    if (!formatter) {
        formatter = new Intl.NumberFormat('fr-FR', {
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
