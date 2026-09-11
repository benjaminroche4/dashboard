import type { Invoice, InvoiceDetail, InvoiceStatusChange } from '@/types';

/** Miroir de InvoiceFactory : facture envoyée, une ligne Accompagné à 1 190 EUR. */
export function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-000000000101',
        number: 'RP-27001',
        client_name: 'Jean Dupont',
        client_email: 'client@exemple.com',
        amount_cents: 128_639,
        currency: 'EUR',
        status: 'sent',
        status_label: 'Envoyée',
        issued_at: '2026-09-04',
        due_at: '2026-10-04',
        paid_at: null,
        deposit_cents: 0,
        due_cents: 128_639,
        can_send: false,
        can_pay: true,
        lead: null,
        ...overrides,
    } as Invoice;
}

export function makeInvoiceDetail(
    overrides: Partial<InvoiceDetail> = {},
): InvoiceDetail {
    return {
        ...makeInvoice(),
        client_street: 'Rue des Alpes 5',
        client_postal_code: '1201',
        client_city: 'Genève',
        client_country: 'Suisse',
        items: [
            {
                offer: 'accompagne',
                description: 'Offre Accompagné',
                quantity: 1,
                unit_price_cents: 119_000,
            },
        ],
        vat_rate: 8.1,
        discount_percent: 0,
        discount_cents: 0,
        vat_cents: 9_639,
        sent_at: '2026-09-04T10:00:00+00:00',
        notes: null,
        bank_name: null,
        bank_iban: null,
        created_by: 'Admin',
        created_by_avatar: null,
        ...overrides,
    } as InvoiceDetail;
}

export function makeStatusChange(
    overrides: Partial<InvoiceStatusChange> = {},
): InvoiceStatusChange {
    return {
        id: 1,
        from: null,
        to: 'Brouillon',
        to_status: 'draft',
        by: 'Admin',
        by_avatar: null,
        note: 'Création',
        at: '2026-09-04T09:00:00+00:00',
        ...overrides,
    } as InvoiceStatusChange;
}
