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

/**
 * Profil de locataire proposé au formulaire (miroir de `App\Enums\DocumentPreset`) :
 * ses pièces se cochent d'un clic.
 */
export type DocumentPresetOption = {
    value: string;
    label: string;
    /** Famille du profil : « Indépendant », « Salarié », « Études ». */
    group: string;
    /** Clés du catalogue cochées par le profil. */
    documents: string[];
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
    /** Partie du dossier fusionné où la pièce est rangée (miroir de `DossierSection`). */
    section?: string;
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
/** Relecture d'une pièce déposée : miroir de `App\Enums\DocumentUploadStatus`. */
export type DocumentUploadStatus = 'pending' | 'accepted' | 'refused';

export type DocumentUpload = {
    id: number;
    uuid: string;
    name: string;
    size: number;
    uploaded_at: string | null;
    download_url: string;
    status: DocumentUploadStatus;
    status_label: string;
    /** Motif du refus, ou remarque de la relecture. */
    review_note: string | null;
    reviewed_at: string | null;
    reviewer: string | null;
    /** Proposition de l'assistant IA, à relire ; null tant qu'il n'a pas lu la pièce. */
    ai_review?: DocumentAnalysis | null;
    ai_reviewed_at?: string | null;
    /** L'assistant a lu des informations reportables sur la fiche d'un locataire. */
    can_apply_profile?: boolean;
};

/** Ce que l'assistant a lu sur une pièce (miroir de `DocumentAnalysisData`). */
export type DocumentAnalysis = {
    document_type: string;
    matches_request: boolean;
    verdict: 'accepted' | 'refused';
    reason: string;
    holder_name: string | null;
    document_date: string | null;
    expires_at: string | null;
    /** Champs de la fiche du locataire, en euros pour `income`. */
    profile: Record<string, string | number>;
};

/** Fait chiffré ou daté relevé par l'assistant sur les pièces d'une partie. */
export type DossierFact = { label: string; value: string };

/** Fiche récapitulative d'une partie du dossier (miroir de `DossierBriefData`). */
export type DossierSectionBrief = {
    /** « 0-income » : index de la personne et thème. */
    key: string;
    person_index: number;
    person: string;
    role: string;
    section: string;
    label: string;
    title: string;
    /** Null quand l'assistant n'a pas pu lire la partie : la fiche liste seulement les pièces. */
    summary: string | null;
    facts: DossierFact[];
    documents: { label: string; note: string | null }[];
    /** Empreinte des fichiers lus : une partie inchangée garde sa fiche à la mise à jour. */
    fingerprint: string | null;
};

/** Une des trois cartes de la page de garde ; `value` null = carte masquée. */
export type DossierFigure = {
    value: string | null;
    detail: string | null;
    /** Une ligne par locataire quand le foyer en compte deux, ou par support. */
    breakdown: DossierFact[];
};

/** Page de garde rédigée par l'assistant. */
export type DossierCoverBrief = {
    summary: string;
    /** Salaires, imposition, épargne : les trois cartes en tête de la page. */
    figures: {
        salary: DossierFigure;
        taxes: DossierFigure;
        savings: DossierFigure;
    };
    /** Points forts du dossier, une ligne chiffrée chacun. */
    highlights: string[];
};

/**
 * Synthèse du dossier fusionné : null tant que rien n'a été demandé ;
 * `pending` pendant que l'assistant lit ; `fresh` faux si les pièces validées
 * ont changé depuis la rédaction.
 */
/** Une étape de la synthèse en cours : une partie du dossier, puis la page de garde. */
export type DossierBriefStep = {
    key: string;
    label: string;
    person: string | null;
    state: 'pending' | 'reading' | 'done' | 'kept';
};

export type DossierBriefProgress = {
    done: number;
    total: number;
    steps: DossierBriefStep[];
};

export type DossierBrief = {
    pending: boolean;
    /** L'avancement, tant que `pending` ; null sinon. */
    progress?: DossierBriefProgress | null;
    fresh: boolean;
    generated_at: string | null;
    cover: DossierCoverBrief | null;
    sections: DossierSectionBrief[];
};

export type DocumentRequestDetail = DocumentRequestSummary & {
    message: string | null;
    /** Lien externe facultatif (Drive…), en plus de la page publique. */
    upload_url: string | null;
    /** Page publique de dépôt, à transmettre au client. */
    public_url: string;
    /** Code d'appairage à 6 chiffres demandé sur la page publique. */
    access_code: string;
    /** Lettre de présentation du foyer, imprimée en tête du dossier fusionné. */
    presentation_letter: string | null;
    link_sent_to: string | null;
    link_sent_at: string | null;
    /** Adresses du lead rattaché (client puis second locataire), pour préremplir l'envoi. */
    lead_emails: string[];
    uploads_count: number;
    /** Pièces validées par l'équipe : les seules que le dossier fusionné et l'archive emportent. */
    valid_uploads_count?: number;
    /** Le membre peut modifier la liste (et donc la rattacher à un lead). */
    can_update: boolean;
    /** Pièces que « Relire les pièces avec l'IA » relira (à vérifier, jamais lues). */
    pending_ai_count?: number;
    /** Chaque pièce demandée a un fichier validé : le dossier peut être préparé. */
    is_complete?: boolean;
    /** Pièces demandées sans fichier validé. */
    missing_count?: number;
    /** Page de garde et fiches rédigées par l'assistant. */
    brief?: DossierBrief | null;
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
    /** Vide sans dossier Drive ; le serveur peut encore envoyer `null`. */
    upload_url: string | null;
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

/**
 * Lead (ou dossier client) proposé dans le sélecteur du formulaire, avec de
 * quoi préremplir le foyer.
 */
export type DocumentRequestLeadOption = {
    id: number;
    uuid: string;
    name: string;
    first_name: string;
    last_name: string;
    reference: string | null;
    company: string | null;
    language: DocumentLanguage;
    /** Lead converti : c'est un dossier client. */
    is_client: boolean;
    /** Garants déclarés par le lead ; un garant physique est une personne du foyer. */
    guarantors: string[];
};

/** Liste de pièces telle que listée sur la fiche d'un lead. */
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
    /** Décision de l'équipe sur la pièce, telle que le client la lit. */
    status: DocumentUploadStatus;
    status_label: string;
    /** Motif d'un refus, pour que le client sache quoi redéposer. */
    review_note: string | null;
    /** Adresse pour rouvrir la pièce déposée (PDF affiché dans l'onglet). */
    url: string;
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
