import { describe, expect, it } from 'vitest';
import {
    quoteFormToInvoiceForm,
    quoteFormToPayload,
    quoteToForm,
    validateQuoteForm,
} from '@/lib/quote-form';
import { makeQuoteDetail } from '@/test/fixtures/quote';
import type { QuoteForm } from '@/types';

const form: QuoteForm = {
    client_name: 'Acme SA',
    client_email: 'compta@acme.ch',
    client_street: 'Rue du Rhône 1',
    client_postal_code: '1204',
    client_city: 'Genève',
    client_country: 'Suisse',
    currency: 'CHF',
    vat_rate: '8.1',
    discount_percent: '10',
    issued_at: '2026-09-07',
    valid_until: '2026-10-07',
    notes: '',
    items: [
        {
            offer: 'accompagne',
            description: '',
            quantity: '1',
            unit_price: '2500',
        },
        {
            offer: null,
            description: 'État des lieux',
            quantity: '2',
            unit_price: '99,99',
        },
    ],
};

describe('quoteFormToInvoiceForm', () => {
    it('maps the validity to the due date, without deposit', () => {
        const invoice = quoteFormToInvoiceForm(form);

        expect(invoice.due_at).toBe('2026-10-07');
        expect(invoice.deposit).toBe('');
        expect(invoice.discount_percent).toBe('10');
        expect(invoice.items).toBe(form.items);
    });
});

describe('quoteToForm', () => {
    it('converts a stored quote back to form values in units', () => {
        const values = quoteToForm(
            makeQuoteDetail({
                notes: 'Merci',
                items: [
                    {
                        offer: null,
                        description: 'Visite',
                        quantity: 2,
                        unit_price_cents: 15_050,
                    },
                ],
            }),
        );

        expect(values.valid_until).toBe('2026-10-07');
        expect(values.vat_rate).toBe('8.1');
        expect(values.notes).toBe('Merci');
        expect(values.items).toEqual([
            {
                offer: null,
                description: 'Visite',
                quantity: '2',
                unit_price: '150.5',
            },
        ]);
    });
});

describe('validateQuoteForm', () => {
    it('accepts a complete form', () => {
        expect(validateQuoteForm(form)).toEqual({});
    });

    it('requires the client, the validity and consistent dates, with Laravel keys', () => {
        const errors = validateQuoteForm({
            ...form,
            client_name: ' ',
            valid_until: '2026-09-01',
            discount_percent: '150',
            items: [
                { offer: null, description: '', quantity: '1', unit_price: '' },
            ],
        });

        expect(errors.client_name).toBe('Le nom du client est obligatoire.');
        expect(errors.valid_until).toBe(
            "La validité doit être postérieure ou égale à la date d'émission.",
        );
        expect(errors.discount_percent).toBe(
            'La remise doit être comprise entre 0 et 100 %.',
        );
        expect(errors['items.0.description']).toBe('Indiquez un libellé.');
        expect(errors['items.0.unit_price_cents']).toBe(
            'Indiquez un prix unitaire.',
        );
        expect(errors).not.toHaveProperty('due_at');
        expect(errors).not.toHaveProperty('deposit_cents');
    });

    it('flags an empty validity date', () => {
        expect(
            validateQuoteForm({ ...form, valid_until: '' }).valid_until,
        ).toBe('La date de validité est obligatoire.');
    });
});

describe('quoteFormToPayload', () => {
    it('sends numbers, cents, the lead and null labels for offer lines', () => {
        const payload = quoteFormToPayload(form, 4);

        expect(payload.lead_id).toBe(4);
        expect(payload.vat_rate).toBe(8.1);
        expect(payload.discount_percent).toBe(10);
        expect(payload.valid_until).toBe('2026-10-07');
        expect(payload.items).toEqual([
            {
                offer: 'accompagne',
                description: null,
                quantity: 1,
                unit_price_cents: 250_000,
            },
            {
                offer: null,
                description: 'État des lieux',
                quantity: 2,
                unit_price_cents: 9_999,
            },
        ]);
        expect(
            quoteFormToPayload({ ...form, discount_percent: '' }, null)
                .discount_percent,
        ).toBe(0);
    });
});
