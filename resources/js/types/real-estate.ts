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
    /** Favori personnel du membre connecté, comme dans la liste des agents. */
    is_favorite: boolean;
    position: string | null;
    phone: string | null;
    email: string | null;
};

/** Lead — ou dossier client, quand il est converti — dont un agent est le contact. */
export type AgentLead = {
    uuid: string;
    name: string;
    status_label: string;
    /** Lead converti : le lien mène au dossier client, pas à la fiche lead. */
    is_client: boolean;
};

/** Agence d'un agent, telle qu'affichée en carte sur sa fiche. */
export type AgentAgencyCard = {
    id: number;
    uuid: string;
    name: string;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
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
    /** Photo principale, affichée en vignette devant les informations. */
    photo: string | null;
    visits_count: number;
    last_visit_at: string;
    last_visit_status: string;
    agent: string | null;
};

export type AgencyDetail = Omit<Agency, 'agents'> &
    Partial<AgencyProfile> & {
        agents: (AgencyAgent & { leads_count: number })[];
        /** Biens visités avec l'un de ses agents, le plus récent d'abord. */
        properties: AgencyVisitedProperty[];
        /** Proposition de l'assistant, tant qu'elle n'est ni appliquée ni écartée. */
        ai_profile?: AgencyAiProfile | null;
        ai_profile_at?: string | null;
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
/** Agence dans un sélecteur : son adresse est celle de ses agents rattachés. */
export type AgencyOption = {
    id: number;
    uuid: string;
    name: string;
    address?: string | null;
};

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
    /** Profil de matching propre à l'agent ; vide, celui de son agence sert. */
    districts?: number[];
    specialties?: string[];
    specialty_labels?: string[];
    languages?: string[];
    language_labels?: string[];
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

/** Option d'une liste fermée du profil (spécialités, langues, mandats). */
export type ProfileOption = { value: string; label: string };

/** Listes du dialogue de profil, exposées par les fiches agence et agent. */
export type ProfileOptions = {
    specialties: ProfileOption[];
    languages: ProfileOption[];
    mandateTypes: ProfileOption[];
};

/**
 * Profil de matching d'une agence : renseigné après coup sur la fiche, jamais
 * exigé à la création. Un agent n'en porte que les trois premières listes.
 */
export type AgencyProfile = {
    districts: number[];
    specialties: string[];
    specialty_labels: string[];
    languages: string[];
    language_labels: string[];
    mandate_types: string[];
    mandate_labels: string[];
    fee_note: string | null;
    rent_min_cents: number | null;
    rent_max_cents: number | null;
    /** null = on ne sait pas encore. */
    accepts_garantme: boolean | null;
    accepts_foreign_files: boolean | null;
    has_profile: boolean;
};

/** Proposition de profil lue par l'assistant sur le site de l'agence, à relire. */
export type AgencyAiProfile = {
    summary: string;
    notes: string;
    districts: number[] | null;
    specialties: string[] | null;
    languages: string[] | null;
    mandate_types: string[] | null;
    fee_note: string | null;
    rent_min_cents: number | null;
    rent_max_cents: number | null;
    accepts_garantme: boolean | null;
    accepts_foreign_files: boolean | null;
};

export type AgencyProfileForm = {
    districts: number[];
    specialties: string[];
    languages: string[];
    mandate_types: string[];
    fee_note: string;
    /** Loyers en unités (euros) dans le formulaire, centimes à l'envoi. */
    rent_min: string;
    rent_max: string;
    /** '' = inconnu, '1' = oui, '0' = non. */
    accepts_garantme: '' | '1' | '0';
    accepts_foreign_files: '' | '1' | '0';
};
