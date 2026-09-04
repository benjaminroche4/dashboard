import { describe, expect, it } from 'vitest';
import { invoiceToForm } from '@/lib/invoice-to-form';
import { makeInvoiceDetail } from '@/test/fixtures/invoice';

describe('invoiceToForm', () => {
    it('maps a stored invoice back to form values in units', () => {
        const form = invoiceToForm(
            makeInvoiceDetail({ deposit_cents: 50_000, discount_percent: 10 }),
        );

        expect(form.deposit).toBe('500');
        expect(form.discount_percent).toBe('10');
        expect(form.items[0].unit_price).toBe('1190');
        expect(form.items[0].quantity).toBe('1');
        expect(form.client_email).toBe('client@exemple.com');
    });
});
