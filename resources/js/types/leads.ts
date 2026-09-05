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

export type LeadLanguage = 'fr' | 'en';
export type PropertyType =
    | 'studio'
    | 't1'
    | 't2'
    | 't3'
    | 't4'
    | 'grand_appartement'
    | 'duplex'
    | 'loft'
    | 'maison';
export type LeadDuration = 'short' | 'medium' | 'long';
export type GuarantorType = 'physique' | 'garantme' | 'bancaire';
export type Furnished = 'furnished' | 'unfurnished' | 'either';
export type RecontactChannel = 'phone' | 'email' | 'whatsapp' | 'visio';

export type LabeledOption<T extends string = string> = {
    value: T;
    label: string;
};

/** Ligne de la liste des leads. */
export type Lead = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    language: LeadLanguage;
    language_label: string;
    offer: OfferValue | null;
    offer_label: string | null;
    arrival_at: string | null;
    budget_cents: number | null;
    currency: Currency;
    origin_city: string | null;
    source_label: string;
    source_note: string | null;
    /** Arrondissements visés (1 à 20). */
    districts: number[];
    property_types: LabeledOption<PropertyType>[];
    duration_label: string | null;
    guarantor_label: string | null;
    furnished_label: string | null;
    message: string | null;
    recontact_channel_label: string | null;
    recontact_at: string | null;
    qualification_note: string | null;
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
    company: string;
    language: LeadLanguage;
    offer: OfferValue | '';
    source: LeadSource;
    source_note: string;
    budget: string;
    currency: Currency;
    arrival_at: string;
    origin_city: string;
    districts: number[];
    property_types: PropertyType[];
    duration: LeadDuration | '';
    guarantor: GuarantorType | '';
    furnished: Furnished | '';
    message: string;
    score: number | null;
    recontact_channel: RecontactChannel | '';
    recontact_at: string;
    qualification_note: string;
    /** Responsable du suivi, pré-rempli avec l'utilisateur courant. */
    assigned_to: number | null;
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
    price_cents: number;
};

/** Lead pré-rempli pour la modification (Converting Machine en mode édition). */
export type LeadEditable = LeadForm & { id: number; name: string };

export type LeadSortKey = 'manual' | 'score' | 'arrival' | 'created';

/** Tous, non attribués, ou l'identifiant d'un membre du staff. */
export type LeadAssigneeFilter = 'all' | 'none' | number;

/** Charge utile du volet d'aperçu (route leads.preview) et de la fiche. */
export type LeadPreviewPayload = {
    lead: LeadDetail;
    notes: LeadNote[];
    history: LeadStatusChange[];
};
