/** Agence immobilière partenaire, telle que listée sur la page Agences. */
export type Agency = {
    id: number;
    uuid: string;
    name: string;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    notes: string | null;
    /** Position posée depuis l'adresse, pour la carte. */
    latitude: number | null;
    longitude: number | null;
    /** Dernier échange noté par l'équipe. */
    last_contacted_at: string | null;
    /** Étoile du membre connecté (favori personnel). */
    is_favorite: boolean;
    agents_count: number;
    /** Agents rattachés, pour la liste dépliable de la page Agences. */
    agents: AgencyAgent[];
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

/** Agent tel que listé sous son agence. */
export type AgencyAgent = {
    id: number;
    uuid: string;
    name: string;
    is_primary: boolean;
    position: string | null;
    phone: string | null;
    email: string | null;
};

/** Lead dont un agent est le contact. */
export type AgentLead = {
    uuid: string;
    name: string;
    status_label: string;
};

/** Agence d'un agent, telle qu'affichée en carte sur sa fiche. */
export type AgentAgencyCard = {
    id: number;
    uuid: string;
    name: string;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    agents_count: number;
};

/** Fiche d'une agence : ses agents avec leur nombre de leads, et les leads via ses agents. */
/** Bien visité avec l'un des agents de l'agence. */
export type AgencyVisitedProperty = {
    uuid: string;
    label: string;
    visits_count: number;
    last_visit_at: string;
    last_visit_status: string;
    agent: string | null;
};

export type AgencyDetail = Omit<Agency, 'agents'> & {
    agents: (AgencyAgent & { leads_count: number })[];
    /** Biens visités avec l'un de ses agents, le plus récent d'abord. */
    properties: AgencyVisitedProperty[];
};

/** Agent proposé sur une fiche lead. */
export type AgentOption = {
    id: number;
    uuid: string;
    name: string;
    agency: string | null;
    phone: string | null;
    /** Étoile du membre connecté : proposé en tête du sélecteur. */
    is_favorite: boolean;
};

/** Agent ou agence partageant l'e-mail ou le téléphone saisi. */
export type ContactDuplicate = {
    id: number;
    uuid: string;
    name: string;
    agency?: string | null;
    email: string | null;
    phone: string | null;
};

/** Ligne d'import collée depuis un tableur. */
export type AgentImportRow = {
    first_name: string;
    last_name: string;
    agency: string;
    position: string;
    email: string;
    phone: string;
};

export type AgencyForm = {
    name: string;
    street: string;
    postal_code: string;
    city: string;
    phone: string;
    email: string;
    website: string;
    notes: string;
    /** Ajout seulement : prévenir le contact par e-mail qu'il rejoint l'annuaire. Décoché par défaut. */
    notify: boolean;
};

/** Agence proposée dans le formulaire d'un agent. */
export type AgencyOption = { id: number; uuid: string; name: string };

/** Agent immobilier, rattaché ou non à une agence. */
export type Agent = {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    name: string;
    /** Libellé de la fonction, pour l'affichage. */
    position: string | null;
    /** Valeur de la fonction (`agentPositions`), pour le formulaire. */
    position_value: string | null;
    /** Qualité de la relation (`relationshipQualities`), null si non notée. */
    relationship_quality: string | null;
    relationship_quality_label: string | null;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    /** Visites faites avec cet agent, et la plus récente. */
    visits_count: number;
    last_visit_at: string | null;
    /** Agent principal de son agence : celui qu'on appelle en premier. */
    is_primary: boolean;
    /** Position posée depuis l'adresse, pour la carte. */
    latitude: number | null;
    longitude: number | null;
    /** Dernier échange noté par l'équipe. */
    last_contacted_at: string | null;
    /** Étoile du membre connecté (favori personnel). */
    is_favorite: boolean;
    agency: AgencyOption | null;
    leads: AgentLead[];
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

/** Ligne d'un import d'agences collé depuis un tableur. */
export type AgencyImportRow = {
    name: string;
    email: string;
    phone: string;
    city: string;
};

export type AgentForm = {
    is_primary: boolean;
    agency_id: string;
    first_name: string;
    last_name: string;
    position: string;
    relationship_quality: string;
    street: string;
    postal_code: string;
    city: string;
    email: string;
    phone: string;
    notes: string;
    /** Ajout seulement : prévenir le contact par e-mail qu'il rejoint l'annuaire. Décoché par défaut. */
    notify: boolean;
};
