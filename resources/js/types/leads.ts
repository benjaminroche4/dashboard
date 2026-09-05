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
    /** Ordre manuel dans la colonne du kanban. */
    position: number;
    last_contacted_at: string | null;
    created_at: string | null;
    created_by: string | null;
    /** Membre du staff responsable du suivi. */
    assignee: { id: number; name: string } | null;
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

export type LeadDetail = Lead & {
    first_name: string;
    last_name: string;
    source: LeadSource;
    updated_at: string | null;
};

export type LeadNote = {
    id: number;
    body: string;
    by: string | null;
    at: string | null;
};

export type LeadStatusChange = {
    id: number;
    from: string | null;
    to: string;
    to_status: LeadStatus;
    by: string | null;
    at: string;
};

export type LeadOfferOption = {
    value: OfferValue;
    label: string;
    description: string;
};

/** Lead pré-rempli pour la modification (Converting Machine en mode édition). */
export type LeadEditable = LeadForm & { id: number; name: string };

export type LeadSortKey = 'manual' | 'score' | 'arrival' | 'created';

export type LeadAssigneeFilter = 'all' | 'me' | 'none';

/** Charge utile du volet d'aperçu (route leads.preview) et de la fiche. */
export type LeadPreviewPayload = {
    lead: LeadDetail;
    notes: LeadNote[];
    history: LeadStatusChange[];
};
