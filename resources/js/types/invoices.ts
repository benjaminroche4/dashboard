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
    /** `null` pour une ligne libre (service hors offres). */
    offer: OfferValue | null;
    description: string;
    quantity: number;
    unit_price_cents: number;
};

/** Ligne de la liste des factures. */
export type Invoice = {
    id: number;
    uuid: string;
    number: string;
    client_name: string;
    client_email: string | null;
    amount_cents: number;
    deposit_cents: number;
    due_cents: number;
    currency: Currency;
    status: InvoiceStatus;
    status_label: string;
    issued_at: string;
    due_at: string;
    paid_at: string | null;
    can_send: boolean;
    can_pay: boolean;
    /** Lead rattaché à la facture, ou null. */
    lead: { id: number; uuid: string; name: string } | null;
};

/** Facture vue depuis une fiche lead. */
export type LeadInvoice = {
    id: number;
    uuid: string;
    number: string;
    client_name: string;
    amount_cents: number;
    currency: Currency;
    status: InvoiceStatus;
    status_label: string;
    issued_at: string;
};

/** Résultat de la recherche de factures (rattachement depuis un lead). */
export type InvoiceSearchHit = {
    id: number;
    uuid: string;
    number: string;
    client_name: string;
    amount_cents: number;
    currency: Currency;
    status_label: string;
    lead: { id: number; uuid: string; name: string } | null;
};

/** Préremplissage de la création depuis une fiche lead (?lead=UUID). */
export type InvoicePrefill = {
    lead_id: number;
    lead_uuid: string;
    lead_name: string;
    client_name: string;
    client_email: string;
    currency: Currency;
    offer: OfferValue | null;
};

/** Facture complète (page de détail). */
export type InvoiceDetail = Invoice & {
    client_street: string | null;
    client_postal_code: string | null;
    client_city: string | null;
    client_country: string | null;
    items: InvoiceLine[];
    vat_rate: number;
    discount_percent: number;
    discount_cents: number;
    subtotal_cents: number;
    vat_cents: number;
    sent_at: string | null;
    notes: string | null;
    created_by: string | null;
    created_by_avatar: string | null;
};

export type InvoiceStatusChange = {
    id: number;
    from: string | null;
    to: string;
    to_status: InvoiceStatus;
    by: string | null;
    note: string | null;
    at: string;
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
    /** `null` pour une ligne libre : le libellé est saisi dans `description`. */
    offer: OfferValue | null;
    description: string;
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
    /** Remise en pourcentage, saisie en texte (« 10 »). */
    discount_percent: string;
    /** Acompte déjà versé, saisi en unités (« 500 »). */
    deposit: string;
    issued_at: string;
    due_at: string;
    notes: string;
    items: InvoiceLineForm[];
};

export type CountryOption = {
    /** Code ISO 3166-1 alpha-2, null pour « Autre ». */
    code: string | null;
    name: string;
};
