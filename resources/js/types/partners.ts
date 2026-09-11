export type PartnerType =
    | 'management'
    | 'insurance'
    | 'bank'
    | 'mover'
    | 'partnership'
    | 'other';

export type PartnerTypeOption = { value: PartnerType; label: string };

/** Partenaire de l'équipe : gestionnaire, assureur, banque, déménageur… */
export type Partner = {
    id: number;
    uuid: string;
    name: string;
    type: PartnerType;
    type_label: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    /** Qualité de la relation (`relationshipQualities`), null si non notée. */
    relationship_quality: string | null;
    relationship_quality_label: string | null;
    /** Dernier échange avec le partenaire (ISO 8601). */
    last_contacted_at: string | null;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    notes: string | null;
    /** Position posée depuis l'adresse, pour la carte. */
    latitude: number | null;
    longitude: number | null;
    /** Étoile personnelle du membre connecté. */
    is_favorite: boolean;
    /** Interlocuteurs chez le partenaire. */
    contacts: PartnerContact[];
    /** Nombre de dossiers (leads) où il intervient. */
    leads_count: number;
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

export type PartnerContact = {
    id: number;
    first_name: string;
    last_name: string;
    name: string;
    /** Libellé de la fonction, pour l'affichage. */
    position: string | null;
    /** Valeur de la fonction (`contactFunctions`), pour le formulaire. */
    position_value: string | null;
    /** Interlocuteur que l'équipe joint d'abord. */
    is_primary: boolean;
    email: string | null;
    phone: string | null;
};

export type PartnerContactForm = {
    first_name: string;
    last_name: string;
    position: string;
    is_primary: boolean;
    email: string;
    phone: string;
};

/** Dossier (lead) sur lequel un partenaire intervient. */
export type PartnerLead = {
    id: number;
    uuid: string;
    name: string;
    status_label: string;
    role_label: string;
    at: string | null;
};

export type PartnerDetail = Partner & {
    leads: PartnerLead[];
    contacts_count: number;
    /** Interlocuteur à joindre d'abord (principal, sinon le premier). */
    primary_contact: {
        id: number;
        name: string;
        position: string | null;
        email: string | null;
        phone: string | null;
    } | null;
    /** Rôles tenus par le partenaire sur les dossiers, sans doublon. */
    roles: string[];
};

/** Partenaire qui partage l'e-mail ou le téléphone : doublon probable. */
export type PartnerDuplicate = {
    uuid: string;
    name: string;
    type_label: string;
};

/** Ce que fait un partenaire sur un dossier. */
export type PartnerRole =
    | 'guarantee'
    | 'home_insurance'
    | 'moving'
    | 'bank_account'
    | 'management'
    | 'other';

export type PartnerRoleOption = { value: PartnerRole; label: string };

/** Partenaire proposé sur une fiche lead. */
export type PartnerOption = {
    id: number;
    name: string;
    type: PartnerType;
    type_label: string;
};

/** Intervention d'un partenaire sur le dossier d'un lead. */
export type LeadPartnerLink = {
    id: number;
    role: PartnerRole;
    role_label: string;
    note: string | null;
    partner: {
        id: number;
        uuid: string;
        name: string;
        type: PartnerType;
        type_label: string;
        email: string | null;
        phone: string | null;
        contacts: { id: number; name: string; email: string | null }[];
    };
};

export type PartnerForm = {
    name: string;
    /** Qualité de la relation (`relationshipQualities`), vide si non notée. */
    relationship_quality: string;
    type: PartnerType | '';
    email: string;
    phone: string;
    website: string;
    street: string;
    postal_code: string;
    city: string;
    notes: string;
    /** Ajout seulement : prévenir le partenaire par e-mail qu'il rejoint l'annuaire. Décoché par défaut. */
    notify: boolean;
};
