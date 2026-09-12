import { describe, expect, it } from 'vitest';
import {
    computeInvoiceTotals,
    toCents,
    toNumber,
    validateInvoiceForm,
} from '@/lib/invoice-totals';
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
                {
                    offer: 'accompagne',
                    description: '',
                    quantity: '2',
                    unit_price: '150',
                },
                {
                    offer: 'confie',
                    description: '',
                    quantity: '1.5',
                    unit_price: '99.99',
                },
            ],
            '8.1',
            offers,
        );

        expect(totals.lines[0].description).toBe('Offre Accompagné');
    });

    it('describes a free line by its label and falls back to « Ligne libre »', () => {
        const totals = computeInvoiceTotals(
            [
                {
                    offer: null,
                    description: '  État des lieux ',
                    quantity: '2',
                    unit_price: '150',
                },
                {
                    offer: null,
                    description: '',
                    quantity: '1',
                    unit_price: '10',
                },
            ],
            '0',
            offers,
        );

        expect(totals.lines[0].description).toBe('État des lieux');
        expect(totals.lines[0].totalCents).toBe(30_000);
        expect(totals.lines[1].description).toBe('Ligne libre');
        expect(totals.lines[1].totalCents).toBe(1_000);
        expect(totals.subtotalCents).toBe(31_000);
    });

    it('computes totals with the same rounding as the backend (continued)', () => {
        const totals = computeInvoiceTotals(
            [
                {
                    offer: 'accompagne',
                    description: '',
                    quantity: '2',
                    unit_price: '150',
                },
                {
                    offer: 'confie',
                    description: '',
                    quantity: '1.5',
                    unit_price: '99.99',
                },
            ],
            '8.1',
            offers,
        );

        expect(totals.lines[1].totalCents).toBe(14_999);
        expect(totals.subtotalCents).toBe(44_999);
        expect(totals.vatCents).toBe(Math.round((44_999 * 8.1) / 100));
        expect(totals.totalCents).toBe(totals.subtotalCents + totals.vatCents);
    });
});

describe('discount, deposit and local validation', () => {
    const form = {
        client_name: 'Acme',
        client_email: '',
        client_street: '',
        client_postal_code: '',
        client_city: '',
        client_country: 'Suisse',
        currency: 'EUR' as const,
        vat_rate: '8.1',
        discount_percent: '',
        deposit: '',
        issued_at: '2026-09-04',
        due_at: '2026-10-04',
        notes: '',
        bank_name: '',
        bank_iban: '',
        bank_reference: '',
        items: [
            {
                offer: 'accompagne' as const,
                description: '',
                quantity: '1',
                unit_price: '1190',
            },
        ],
    };

    it('applies the discount before VAT and deducts the deposit', () => {
        const totals = computeInvoiceTotals(form.items, '8.1', offers, {
            discountPercent: '10',
            deposit: '500',
        });

        // 119000 − 10 % = 107100 ; TVA 8,1 % = 8675 ; total 115775 ; − 50000
        expect(totals.discountCents).toBe(11_900);
        expect(totals.netSubtotalCents).toBe(107_100);
        expect(totals.vatCents).toBe(8_675);
        expect(totals.totalCents).toBe(115_775);
        expect(totals.dueCents).toBe(65_775);
    });

    it('accepts a valid form', () => {
        expect(validateInvoiceForm(form)).toEqual({});
    });

    it('reports missing name, invalid email, inverted dates, bad discount and deposit', () => {
        const errors = validateInvoiceForm({
            ...form,
            client_name: ' ',
            client_email: 'pas-un-mail',
            due_at: '2026-09-01',
            discount_percent: '150',
            deposit: '999999',
            items: [
                {
                    offer: 'confie',
                    description: '',
                    quantity: '-1',
                    unit_price: '',
                },
            ],
        });

        expect(errors.client_name).toBe('Le nom du client est obligatoire.');
        expect(errors.client_email).toBe("L'adresse e-mail n'est pas valide.");
        expect(errors.due_at).toMatch(/postérieure/);
        expect(errors.discount_percent).toMatch(/0 et 100/);
        expect(errors.deposit_cents).toMatch(/dépasse le total/);
        expect(errors['items.0.unit_price_cents']).toBe(
            'Indiquez un prix unitaire.',
        );
        expect(errors['items.0.quantity']).toBe('Indiquez une quantité.');
    });

    it('requires at least one line', () => {
        expect(validateInvoiceForm({ ...form, items: [] }).items).toBe(
            'Ajoutez au moins une ligne.',
        );
    });
});
