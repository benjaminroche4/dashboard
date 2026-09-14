import type { LeadAgent, LeadNote, OfferValue } from '@/types';
export type ClientPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ClientPriorityOption = { value: ClientPriority; label: string };

/** Un client : lead converti, vu comme un dossier en cours. */
/** Miroir de `App\Enums\ClientClosingReason` : comment un dossier s'est terminé. */
export type ClientClosingReason =
    | 'installed'
    | 'withdrawn'
    | 'no_home'
    | 'other';

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
    /** Dossier clôturé : date, motif et précision ; null tant qu'il est suivi. */
    closed_at: string | null;
    closing_reason: ClientClosingReason | null;
    closing_reason_label: string | null;
    closing_note: string | null;
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
    /** Revenu du locataire principal, déclaré sur sa fiche. */
    income_cents: number | null;
    /** Somme des revenus déclarés par les fiches des locataires. */
    household_income_cents: number | null;
    /** Agent immobilier du dossier, comme sur la fiche lead. */
    agent: LeadAgent | null;
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
/**
 * Suite donnée à un bien pour un client, une fois la visite faite : miroir de
 * `App\Enums\PropertyApplicationStatus`.
 */
export type PropertyApplicationStatus =
    | 'pending'
    | 'declined'
    | 'applied'
    | 'accepted'
    | 'rejected';

/** Une étape proposée dans le menu, avec ce qu'elle veut dire. */
/** Où en est la recherche du client, en quelques chiffres. */
export type ClientProgress = {
    visits_done: number;
    /** Biens que le client a écartés : ses refus à lui. */
    properties_refused: number;
    /** Candidatures en jeu : déposées ou acceptées. */
    applications: number;
};

export type PropertyStatusOption = {
    value: PropertyApplicationStatus;
    label: string;
    hint: string;
};

/** Ce que devient le bien visité pour ce client (prop `outcome`). */
export type VisitOutcome = {
    status: PropertyApplicationStatus;
    status_label: string;
    options: PropertyStatusOption[];
    /** Date de la visite quand elle est faite, sinon null. */
    visited_at: string | null;
    /** Visite faite et rien de tranché depuis le délai de relance. */
    decision_due: boolean;
    /** Depuis quand le bien en est à cette étape. */
    status_at?: string | null;
    /** Dernière relance partie aux personnes de suivi. */
    reminded_at?: string | null;
    /** Prochaine relance automatique, tant que rien n'est tranché. */
    reminder_at?: string | null;
};

/** Personne de suivi : en copie des e-mails du dossier. */
export type ClientWatcher = {
    uuid: string;
    name: string;
    email: string;
    phone: string | null;
    /** Ce qu'elle est pour le client (« Mère », « Service RH »…). */
    role: string | null;
};

export type ClientGuarantor = {
    uuid: string;
    first_name: string;
    last_name: string;
    name: string;
    email: string | null;
    phone: string | null;
    /** Ce que le garant fait dans la vie. */
    employment_status: string | null;
    employment_status_label: string | null;
    occupation: string | null;
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

/**
 * Note interne d'un dossier : la même forme que sur la fiche lead — les deux
 * écrans partagent les bulles, le compositeur et les routes `leads.notes.*`.
 */
export type ClientNote = LeadNote;

/** Bien de l'annuaire rattaché à un dossier, avec les visites de ce client. */
export type ClientProperty = {
    id: number;
    uuid: string;
    label: string;
    /** Photo principale, affichée en vignette devant les informations. */
    photo: string | null;
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
    /** Dernière relance partie aux personnes de suivi, et prochaine prévue. */
    reminded_at?: string | null;
    reminder_at?: string | null;
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
    /** Photo principale (première photo), pour la vignette de la liste. */
    photo: string | null;
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

/** État du dossier de location (miroir de App\Enums\DossierStatus). */
export type DossierStatus = 'not_started' | 'incomplete' | 'to_check' | 'ready';

/** Où en est le dossier : on compte les pièces demandées, pas les fichiers. */
export type DossierReadiness = {
    status: DossierStatus;
    status_label: string;
    total: number;
    accepted: number;
    to_check: number;
    refused: number;
    missing: number;
    /** Part des pièces validées, de 0 à 100. */
    percent: number;
};

/** Agent d'une agence suggérée, avec sa note et ses raisons. */
export type SuggestedAgent = {
    id: number;
    uuid: string;
    name: string;
    position: string | null;
    phone: string | null;
    email: string | null;
    relationship_quality: string | null;
    relationship_quality_label: string | null;
    is_primary: boolean;
    score: number;
    reasons: string[];
};

/**
 * Agence (ou agent indépendant) à contacter pour un dossier : la note du
 * meilleur agent, les raisons en clair, et les agents notés.
 */
export type ClientAgentSuggestion = {
    /** `agency:12` ou `agent:34` : la clé que l'assistant renvoie dans son classement. */
    key: string;
    agency: {
        id: number;
        uuid: string;
        name: string;
        city: string | null;
        postal_code: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        has_profile: boolean;
    } | null;
    agents: SuggestedAgent[];
    best_agent: SuggestedAgent | null;
    score: number;
    reasons: string[];
    available_properties: number;
};

/** Adéquation et phrase de l'assistant pour une agence suggérée. */
export type ClientAgentExplanation = {
    key: string;
    fit: 'strong' | 'good' | 'weak';
    reason: string;
};

/** Agence trouvée via Google Places dans les quartiers visés. */
export type DiscoveredAgency = {
    id: string;
    name: string;
    address: string;
    rating: number | null;
    ratings: number;
    latitude: number | null;
    longitude: number | null;
    district: number;
    /** Déjà dans l'annuaire : l'UUID de sa fiche. */
    known_uuid: string | null;
};
