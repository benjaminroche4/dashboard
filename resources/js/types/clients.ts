import type { OfferValue } from '@/types';
export type ClientPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ClientPriorityOption = { value: ClientPriority; label: string };

/** Un client : lead converti, vu comme un dossier en cours. */
export type Client = {
    id: number;
    uuid: string;
    reference: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    offer: OfferValue | null;
    offer_label: string | null;
    priority: ClientPriority;
    priority_label: string;
    /** Rang de tri (Urgente = 3, Basse = 0). */
    priority_rank: number;
    arrival_at: string | null;
    /** Date de passage en « Converti » (ISO 8601). */
    converted_at: string | null;
    assignee: { id: number; name: string; avatar: string | null } | null;
    /** Second locataire du foyer, quand le dossier en compte deux. */
    co_tenant: {
        first_name: string | null;
        last_name: string | null;
        name: string | null;
        email: string | null;
        phone: string | null;
        income_cents: number | null;
    } | null;
    /** Second membre qui suit le dossier. */
    co_assignee: { id: number; name: string; avatar: string | null } | null;
    /** Revenus mensuels nets du foyer, en centimes. */
    income_cents: number | null;
    co_income_cents: number | null;
    household_income_cents: number | null;
    invoices_count: number;
    document_requests_count: number;
};

/** Fiche d'un dossier client : le client et son projet de logement. */
export type ClientDetail = Client & {
    language_label: string;
    origin_city: string | null;
    budget_cents: number | null;
    currency: string;
    districts: number[];
    property_types: string[];
    duration_label: string | null;
    furnished_label: string | null;
    guarantor_label: string | null;
    message: string | null;
    score: number | null;
};

/** Emplacement d'un locataire du dossier. */
export type TenantSlot = 'primary' | 'co';

/**
 * Détails d'un locataire : état civil, titre de séjour et situation
 * professionnelle. Un garant ou un membre du suivi n'en a pas.
 */
export type TenantProfile = {
    name: string;
    role: string;
    birth_date: string | null;
    nationality: string | null;
    birth_place: string | null;
    residency_status: string | null;
    residency_label: string | null;
    /** Faux pour un citoyen de l'UE : ni numéro ni validité à fournir. */
    residency_needs_document: boolean;
    residency_number: string | null;
    residency_expires_at: string | null;
    employment_status: string | null;
    employment_label: string | null;
    employer: string | null;
    income_cents: number | null;
};

/** Garant du dossier, repris des listes de documents (personnes du foyer). */
export type ClientGuarantor = {
    uuid: string;
    first_name: string;
    last_name: string;
    name: string;
    email: string | null;
    phone: string | null;
    /** Revenu mensuel net, en centimes. */
    income_cents: number | null;
    note: string | null;
};

/** Facturé, encaissé et reste dû d'un dossier, par devise (hors factures annulées). */
export type ClientTotals = {
    currency: string;
    invoiced_cents: number;
    paid_cents: number;
    due_cents: number;
};

export type ClientNote = {
    id: number;
    body: string;
    by: string | null;
    avatar: string | null;
    at: string | null;
};

/** Bien de l'annuaire rattaché à un dossier, avec les visites de ce client. */
export type ClientProperty = {
    id: number;
    uuid: string;
    label: string;
    street: string;
    postal_code: string | null;
    city: string | null;
    property_type_label: string | null;
    surface_m2: number | null;
    rent_cents: number | null;
    currency: string;
    listing_url: string | null;
    agent: string | null;
    /** Client à qui le bien est attribué : il est pris, même par un autre dossier. */
    assigned_lead: { uuid: string; name: string } | null;
    visits_count: number;
    /** Prochaine visite planifiée de ce client sur ce bien (ISO), ou null. */
    next_visit_at: string | null;
};

/** Bien de l'annuaire pas encore rattaché au dossier, pour « Lier un bien ». */
export type ClientPropertyOption = {
    id: number;
    label: string;
    street: string;
    postal_code: string | null;
    city: string | null;
    /** Photo principale (première photo), pour la vignette de la liste. */
    photo?: string | null;
};

/** Bien de l'annuaire suggéré pour un dossier, avec les critères du projet qu'il remplit. */
export type ClientPropertySuggestion = {
    id: number;
    uuid: string;
    label: string;
    street: string;
    postal_code: string | null;
    city: string | null;
    property_type_label: string | null;
    furnished_label: string | null;
    surface_m2: number | null;
    rent_cents: number | null;
    currency: string;
    listing_url: string | null;
    agent: string | null;
    score: number;
    /** Critères remplis, en clair (« Dans le budget », « Arrondissement recherché (11e) »…). */
    reasons: string[];
};

/** Avis de l'assistant IA sur un bien suggéré : adéquation et explication en une phrase. */
export type ClientPropertyExplanation = {
    id: number;
    fit: 'strong' | 'good' | 'weak';
    reason: string;
};
