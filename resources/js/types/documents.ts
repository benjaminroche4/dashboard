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
    uuid: string;
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
    lead: {
        id: number;
        uuid: string;
        name: string;
        reference: string | null;
    } | null;
    created_at: string | null;
};

/** Pièce imprimée : libellé traduit et aide facultative. */
export type DocumentDetail = {
    /** Clé du catalogue (sert au dépôt public). */
    key?: string;
    label: string;
    hint: string | null;
    /** Fichiers déposés par le client pour cette pièce (page de la liste). */
    uploads?: DocumentUpload[];
};

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

/** Fichier déposé par le client sur la page publique. */
export type DocumentUpload = {
    id: number;
    uuid: string;
    name: string;
    size: number;
    uploaded_at: string | null;
    download_url: string;
};

export type DocumentRequestDetail = DocumentRequestSummary & {
    message: string | null;
    /** Lien externe facultatif (Drive…), en plus de la page publique. */
    upload_url: string | null;
    /** Page publique de dépôt, à transmettre au client. */
    public_url: string;
    /** Code d'appairage à 6 chiffres demandé sur la page publique. */
    access_code: string;
    link_sent_to: string | null;
    link_sent_at: string | null;
    /** E-mail du lead rattaché, pour préremplir l'envoi du lien. */
    lead_email: string | null;
    uploads_count: number;
    persons: HouseholdPersonDetail[];
};

/** Liste existante chargée dans le formulaire pour modification. */
export type DocumentRequestEdit = {
    id: number;
    uuid: string;
    name: string;
    lead_id: number | null;
    language: DocumentLanguage;
    message: string;
    upload_url: string;
    persons: HouseholdPersonForm[];
};

/** Préremplissage depuis une fiche lead (`?lead=UUID`). */
export type DocumentRequestPrefill = {
    lead_id: number;
    lead_uuid: string;
    lead_name: string;
    first_name: string;
    last_name: string;
    language: DocumentLanguage;
};

/** Liste de documents telle que listée sur la fiche d'un lead. */
export type LeadDocumentRequest = {
    id: number;
    uuid: string;
    name: string;
    person_count: number;
    document_count: number;
    created_at: string | null;
};

/** Fichier déposé, vu depuis la page publique (sans lien de téléchargement). */
export type PublicDocumentUpload = {
    uuid: string;
    name: string;
    size: number;
    uploaded_at: string | null;
};

/** Pièce demandée sur la page publique, avec les fichiers déjà reçus. */
export type PublicDocumentDetail = {
    key: string;
    label: string;
    hint: string | null;
    uploads: PublicDocumentUpload[];
};

export type PublicDocumentCategory = {
    value: string;
    label: string;
    documents: PublicDocumentDetail[];
};

/** Personne du foyer sur la page publique de dépôt. */
export type PublicDocumentPerson = {
    index: number;
    name: string;
    role: string;
    categories: PublicDocumentCategory[];
};
