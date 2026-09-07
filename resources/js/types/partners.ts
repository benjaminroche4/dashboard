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
    street: string | null;
    postal_code: string | null;
    city: string | null;
    notes: string | null;
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
    position: string | null;
    email: string | null;
    phone: string | null;
};

export type PartnerContactForm = {
    first_name: string;
    last_name: string;
    position: string;
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

export type PartnerDetail = Partner & { leads: PartnerLead[] };

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
    type: PartnerType | '';
    email: string;
    phone: string;
    website: string;
    street: string;
    postal_code: string;
    city: string;
    notes: string;
};
