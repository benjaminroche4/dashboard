/** Entreprise de l'annuaire : employeur ou société qui nous confie ses collaborateurs. */
export type CompanyEntry = {
    id: number;
    uuid: string;
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    notes: string | null;
    /** URL du logo (image de profil de l'entreprise), ou null. */
    logo: string | null;
    /** Contacts dans l'entreprise, les principaux en tête. */
    contacts: CompanyContact[];
    /** Nombre de contacts marqués principaux (plusieurs possibles). */
    primary_contacts_count: number;
    /** Nombre de dossiers clients rattachés. */
    clients_count: number;
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

export type CompanyContact = {
    id: number;
    first_name: string;
    last_name: string;
    name: string;
    /** Libellé de la fonction, pour l'affichage. */
    position: string | null;
    /** Valeur de la fonction (`contactFunctions`), pour le formulaire. */
    position_value: string | null;
    /** Contact principal : plusieurs possibles dans une même entreprise. */
    is_primary: boolean;
    email: string | null;
    phone: string | null;
};

export type CompanyContactForm = {
    first_name: string;
    last_name: string;
    position: string;
    is_primary: boolean;
    email: string;
    phone: string;
};

/** Dossier client rattaché à une entreprise. */
export type CompanyClient = {
    id: number;
    uuid: string;
    name: string;
    reference: string | null;
    status_label: string;
    is_closed: boolean;
    /** Formule du dossier (`OfferValue`), pour le badge. */
    offer: 'accompagne' | 'confie' | null;
    offer_label: string | null;
    arrival_at: string | null;
    assignee: string | null;
};

/** Dossier client encore libre, proposé dans « Rattacher un client ». */
export type CompanyClientOption = {
    id: number;
    uuid: string;
    name: string;
    reference: string | null;
    company: string | null;
};

export type CompanyDetail = CompanyEntry & {
    clients: CompanyClient[];
};

/** Entreprise qui partage l'e-mail ou le téléphone : doublon probable. */
export type CompanyDuplicate = {
    uuid: string;
    name: string;
};

export type CompanyForm = {
    name: string;
    email: string;
    phone: string;
    website: string;
    street: string;
    postal_code: string;
    city: string;
    notes: string;
};
