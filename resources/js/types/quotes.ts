import type { LinkedLead } from '@/components/leads/lead-link-card';
import type { LinkedPartner } from './partners';
import type {
    Currency,
    DocumentSubject,
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
    /** Devis en jeu (brouillon ou envoyé) : encore modifiable. */
    can_edit?: boolean;
    can_accept: boolean;
    can_decline: boolean;
    can_invoice: boolean;
    /** Lead rattaché au devis, ou null. */
    lead: LinkedLead | null;
    /** Facture créée depuis le devis, ou null tant qu'il n'est pas facturé. */
    invoice: { id: number; uuid: string; number: string } | null;
};

/** Devis complet (page de détail). */
export type QuoteDetail = Quote & {
    /** Partenaire à qui le devis est adressé, s'il y en a un. */
    partner: LinkedPartner | null;
    /** Compte d'encaissement figé sur le devis ; null = compte par défaut. */
    bank_name: string | null;
    bank_iban: string | null;
    bank_reference: string | null;
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
    subject: DocumentSubject;
    client_name: string;
    client_email: string;
    client_street: string;
    client_postal_code: string;
    client_city: string;
    currency: Currency;
    offer: OfferValue | null;
};

/** Formulaire de devis : mêmes champs qu'une facture, validité à la place de l'échéance, pas d'acompte. */
export type QuoteForm = {
    /** Compte d'encaissement : vide = compte par défaut de la devise. */
    bank_name: string;
    bank_iban: string;
    bank_reference: string;
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
