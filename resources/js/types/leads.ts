import type { Currency, OfferValue } from '@/types/invoices';

export type LeadStatus =
    | 'todo'
    | 'in_progress'
    | 'quote_sent'
    | 'converted'
    | 'archived';

export type LeadSource =
    | 'website'
    | 'referral'
    | 'social_media'
    | 'partner'
    | 'other';

/** Ligne de la liste des leads. */
export type Lead = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    offer: OfferValue | null;
    offer_label: string | null;
    arrival_at: string | null;
    budget_cents: number | null;
    currency: Currency;
    origin_city: string | null;
    source_label: string;
    message: string | null;
    /** Qualité estimée, de 1 à 5. */
    score: number | null;
    status: LeadStatus;
    status_label: string;
    last_contacted_at: string | null;
    created_at: string | null;
    created_by: string | null;
};

export type LeadStatusOption = { value: LeadStatus; label: string };

/** Formulaire « Converting Machine » : chaînes tant que l'utilisateur saisit. */
export type LeadForm = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    offer: OfferValue | '';
    arrival_at: string;
    budget: string;
    currency: Currency;
    origin_city: string;
    source: LeadSource;
    message: string;
    score: number | null;
};
