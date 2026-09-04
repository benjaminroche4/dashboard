export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type Currency = 'CHF' | 'EUR';

export type OfferValue = 'accompagne' | 'confie';

export type Offer = {
    value: OfferValue;
    label: string;
    description: string;
    /** Prix unitaire par défaut en centimes, par devise. */
    prices: Record<Currency, number>;
};

export type InvoiceLine = {
    offer: OfferValue;
    description: string;
    quantity: number;
    unit_price_cents: number;
};

export type Invoice = {
    id: number;
    number: string;
    client_name: string;
    client_email: string | null;
    amount_cents: number;
    currency: Currency;
    status: InvoiceStatus;
    status_label: string;
    issued_at: string;
    due_at: string;
    paid_at: string | null;
};

export type Company = {
    name: string;
    address: string;
    email: string;
    phone: string;
    vat_number: string;
    iban: string;
    bank: string;
    default_vat_rate: number;
    default_currency: Currency;
    default_payment_terms_days: number;
};

/** Ligne du formulaire : les montants sont saisis en unités (francs / euros), pas en centimes. */
export type InvoiceLineForm = {
    offer: OfferValue;
    quantity: string;
    unit_price: string;
};

export type InvoiceForm = {
    client_name: string;
    client_email: string;
    client_street: string;
    client_postal_code: string;
    client_city: string;
    client_country: string;
    currency: Currency;
    vat_rate: string;
    issued_at: string;
    due_at: string;
    notes: string;
    items: InvoiceLineForm[];
};
