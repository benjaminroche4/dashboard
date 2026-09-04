import { describe, expect, it } from 'vitest';
import { computeInvoiceTotals, toCents, toNumber } from '@/lib/invoice-totals';
import type { Offer } from '@/types';

const offers: Offer[] = [
    {
        value: 'accompagne',
        label: 'Accompagné',
        description: 'Offre Accompagné',
        prices: { CHF: 0, EUR: 0 },
    },
    {
        value: 'confie',
        label: 'Confié',
        description: 'Offre Confié',
        prices: { CHF: 0, EUR: 0 },
    },
];

describe('invoice totals', () => {
    it('parses French and English decimal input into cents', () => {
        expect(toCents('12,50')).toBe(1250);
        expect(toCents('12.5')).toBe(1250);
        expect(toCents('')).toBe(0);
        expect(toCents('abc')).toBe(0);
        expect(toNumber('1,5')).toBe(1.5);
    });

    it('computes totals with the same rounding as the backend', () => {
        const totals = computeInvoiceTotals(
            [
                { offer: 'accompagne', quantity: '2', unit_price: '150' },
                { offer: 'confie', quantity: '1.5', unit_price: '99.99' },
            ],
            '8.1',
            offers,
        );

        expect(totals.lines[0].description).toBe('Offre Accompagné');
        expect(totals.lines[1].totalCents).toBe(14_999);
        expect(totals.subtotalCents).toBe(44_999);
        expect(totals.vatCents).toBe(Math.round((44_999 * 8.1) / 100));
        expect(totals.totalCents).toBe(totals.subtotalCents + totals.vatCents);
    });
});
