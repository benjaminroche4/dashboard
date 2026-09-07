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
export type AgencyDetail = Omit<Agency, 'agents'> & {
    agents: (AgencyAgent & { leads_count: number })[];
    leads: (AgentLead & { agent: string | null })[];
};

/** Agent proposé sur une fiche lead. */
export type AgentOption = {
    id: number;
    uuid: string;
    name: string;
    agency: string | null;
    phone: string | null;
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
    street: string | null;
    postal_code: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    agency: AgencyOption | null;
    leads: AgentLead[];
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

export type AgentForm = {
    agency_id: string;
    first_name: string;
    last_name: string;
    position: string;
    street: string;
    postal_code: string;
    city: string;
    email: string;
    phone: string;
    notes: string;
};
