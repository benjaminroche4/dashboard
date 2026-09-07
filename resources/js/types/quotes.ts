import type {
    Currency,
    InvoiceLine,
    InvoiceLineForm,
    OfferValue,
} from './invoices';

export type QuoteStatus =
    | 'draft'
    | 'sent'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'invoiced';

/** Ligne de la liste des devis. */
export type Quote = {
    id: number;
    uuid: string;
    number: string;
    client_name: string;
    client_email: string | null;
    amount_cents: number;
    currency: Currency;
    status: QuoteStatus;
    status_label: string;
    issued_at: string;
    valid_until: string;
    can_send: boolean;
    can_accept: boolean;
    can_decline: boolean;
    can_invoice: boolean;
    /** Lead rattaché au devis, ou null. */
    lead: { id: number; uuid: string; name: string } | null;
    /** Facture créée depuis le devis, ou null tant qu'il n'est pas facturé. */
    invoice: { id: number; uuid: string; number: string } | null;
};

/** Devis complet (page de détail). */
export type QuoteDetail = Quote & {
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
    accepted_at: string | null;
    declined_at: string | null;
    notes: string | null;
    created_by: string | null;
    created_by_avatar: string | null;
};

export type QuoteStatusChange = {
    id: number;
    from: string | null;
    to: string;
    to_status: QuoteStatus;
    by: string | null;
    note: string | null;
    at: string;
};

/** Devis vu depuis une fiche lead. */
export type LeadQuote = {
    id: number;
    uuid: string;
    number: string;
    client_name: string;
    amount_cents: number;
    currency: Currency;
    status: QuoteStatus;
    status_label: string;
    issued_at: string;
    valid_until: string;
};

/** Préremplissage de la création depuis une fiche lead (?lead=UUID). */
export type QuotePrefill = {
    lead_id: number;
    lead_uuid: string;
    lead_name: string;
    client_name: string;
    client_email: string;
    currency: Currency;
    offer: OfferValue | null;
};

/** Formulaire de devis : mêmes champs qu'une facture, validité à la place de l'échéance, pas d'acompte. */
export type QuoteForm = {
    client_name: string;
    client_email: string;
    client_street: string;
    client_postal_code: string;
    client_city: string;
    client_country: string;
    currency: Currency;
    vat_rate: string;
    discount_percent: string;
    issued_at: string;
    valid_until: string;
    notes: string;
    items: InvoiceLineForm[];
};
