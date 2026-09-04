import type { InvoiceLineForm, Offer } from '@/types';

export type InvoiceTotals = {
    lines: {
        description: string;
        quantity: number;
        unitPriceCents: number;
        totalCents: number;
    }[];
    subtotalCents: number;
    vatCents: number;
    totalCents: number;
};

/** « 12,50 » ou « 12.50 » → 1250 centimes. Invalide → 0. */
export function toCents(value: string | number): number {
    const parsed =
        typeof value === 'number' ? value : Number(value.replace(',', '.'));

    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function toNumber(value: string | number): number {
    const parsed =
        typeof value === 'number' ? value : Number(value.replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Mêmes règles que côté PHP (InvoiceData) : total ligne arrondi au centime,
 * TVA arrondie au centime sur le sous-total.
 */
export function computeInvoiceTotals(
    items: InvoiceLineForm[],
    vatRate: string | number,
    offers: Offer[] = [],
): InvoiceTotals {
    const lines = items.map((item) => {
        const quantity = toNumber(item.quantity);
        const unitPriceCents = toCents(item.unit_price);
        const offer = offers.find(
            (candidate) => candidate.value === item.offer,
        );

        return {
            description: offer?.description ?? item.offer,
            quantity,
            unitPriceCents,
            totalCents: Math.round(quantity * unitPriceCents),
        };
    });
    const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
    const vatCents = Math.round((subtotalCents * toNumber(vatRate)) / 100);

    return {
        lines,
        subtotalCents,
        vatCents,
        totalCents: subtotalCents + vatCents,
    };
}
