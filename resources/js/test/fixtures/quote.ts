import type { Quote, QuoteDetail, QuoteStatusChange } from '@/types';

/** Miroir de QuoteFactory : devis envoyé, une ligne Accompagné à 1 190 EUR. */
export function makeQuote(overrides: Partial<Quote> = {}): Quote {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-00000000d001',
        number: 'DV-27001',
        client_name: 'Jean Dupont',
        client_email: 'client@exemple.com',
        amount_cents: 128_639,
        currency: 'EUR',
        status: 'sent',
        status_label: 'Envoyé',
        issued_at: '2026-09-07',
        valid_until: '2026-10-07',
        can_send: false,
        can_accept: true,
        can_decline: true,
        can_invoice: true,
        lead: null,
        invoice: null,
        ...overrides,
    };
}

export function makeQuoteDetail(
    overrides: Partial<QuoteDetail> = {},
): QuoteDetail {
    return {
        ...makeQuote(),
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
        subtotal_cents: 119_000,
        vat_cents: 9_639,
        sent_at: '2026-09-07T10:00:00+00:00',
        accepted_at: null,
        declined_at: null,
        notes: null,
        bank_name: null,
        bank_iban: null,
        created_by: 'Admin',
        created_by_avatar: null,
        ...overrides,
    };
}

export function makeQuoteStatusChange(
    overrides: Partial<QuoteStatusChange> = {},
): QuoteStatusChange {
    return {
        id: 1,
        from: null,
        to: 'Brouillon',
        to_status: 'draft',
        by: 'Admin',
        note: 'Création',
        at: '2026-09-07T09:00:00+00:00',
        ...overrides,
    };
}
