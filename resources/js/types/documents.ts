export type HouseholdRole = 'tenant' | 'guarantor';

export type DocumentLanguage = 'fr' | 'en';

/** Une pièce du catalogue, avec son aide facultative. */
export type CatalogItem = {
    key: string;
    label: string;
    hint: string | null;
};

/** Une catégorie du catalogue (Études, Finance…) et ses pièces. */
export type CatalogGroup = {
    value: string;
    label: string;
    items: CatalogItem[];
};

/** Personne du foyer dans le formulaire : identité, rôle et clés des pièces cochées. */
export type HouseholdPersonForm = {
    first_name: string;
    last_name: string;
    role: HouseholdRole;
    documents: string[];
};

export type DocumentRequestForm = {
    language: DocumentLanguage;
    message: string;
    upload_url: string;
    persons: HouseholdPersonForm[];
};

/** Ligne de la liste des demandes de pièces. Le client est la première personne du foyer. */
export type DocumentRequestSummary = {
    id: number;
    first_name: string;
    last_name: string;
    name: string;
    language: DocumentLanguage;
    language_label: string;
    person_count: number;
    document_count: number;
    creator: string | null;
    creator_avatar: string | null;
    /** Lead à l'origine de la liste, s'il y en a un. */
    lead: { id: number; name: string; reference: string | null } | null;
    created_at: string | null;
};

/** Pièce imprimée : libellé traduit et aide facultative. */
export type DocumentDetail = { label: string; hint: string | null };

/** Catégorie d'une personne avec ses pièces, dans l'ordre du catalogue. */
export type DocumentCategoryDetail = {
    value: string;
    label: string;
    documents: DocumentDetail[];
};

/** Personne du foyer telle qu'imprimée : nom, rôle et pièces par catégorie. */
export type HouseholdPersonDetail = {
    name: string;
    role: string;
    categories: DocumentCategoryDetail[];
};

export type DocumentRequestDetail = DocumentRequestSummary & {
    message: string | null;
    upload_url: string;
    persons: HouseholdPersonDetail[];
};

/** Liste existante chargée dans le formulaire pour modification. */
export type DocumentRequestEdit = {
    id: number;
    name: string;
    lead_id: number | null;
    language: DocumentLanguage;
    message: string;
    upload_url: string;
    persons: HouseholdPersonForm[];
};

/** Préremplissage depuis une fiche lead (`?lead=ID`). */
export type DocumentRequestPrefill = {
    lead_id: number;
    lead_name: string;
    first_name: string;
    last_name: string;
    language: DocumentLanguage;
};

/** Liste de documents telle que listée sur la fiche d'un lead. */
export type LeadDocumentRequest = {
    id: number;
    name: string;
    person_count: number;
    document_count: number;
    created_at: string | null;
};
