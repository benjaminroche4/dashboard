import type { InvoiceDetail, InvoiceForm } from '@/types';

/** Convertit une facture enregistrée en données de formulaire, pour réutiliser l'aperçu. */
export function invoiceToForm(invoice: InvoiceDetail): InvoiceForm {
    return {
        client_name: invoice.client_name,
        client_email: invoice.client_email ?? '',
        client_street: invoice.client_street ?? '',
        client_postal_code: invoice.client_postal_code ?? '',
        client_city: invoice.client_city ?? '',
        client_country: invoice.client_country ?? '',
        currency: invoice.currency,
        vat_rate: String(invoice.vat_rate),
        discount_percent: String(invoice.discount_percent),
        deposit: String(invoice.deposit_cents / 100),
        issued_at: invoice.issued_at,
        due_at: invoice.due_at,
        notes: invoice.notes ?? '',
        items: invoice.items.map((line) => ({
            offer: line.offer,
            quantity: String(line.quantity),
            unit_price: String(line.unit_price_cents / 100),
        })),
    };
}
