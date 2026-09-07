import type { Currency, OfferValue } from '@/types/invoices';

export type LeadLossReason =
    | 'too_expensive'
    | 'went_elsewhere'
    | 'no_answer'
    | 'out_of_scope'
    | 'other';

export type LeadStatus =
    | 'todo'
    | 'in_progress'
    | 'quote_sent'
    | 'converted'
    | 'archived';

export type LeadSource =
    | 'website'
    | 'phone'
    | 'referral'
    | 'social_media'
    | 'partner'
    | 'other';

export type LeadLanguage = 'fr' | 'en';
export type PropertyType =
    | 'studio'
    | 't1'
    | 't2'
    | 't3'
    | 't4'
    | 'grand_appartement'
    | 'duplex'
    | 'loft'
    | 'maison';
export type LeadDuration = 'short' | 'medium' | 'long';
export type GuarantorType = 'physique' | 'garantme' | 'bancaire';
export type Furnished = 'furnished' | 'unfurnished' | 'either';
export type RecontactChannel = 'phone' | 'email' | 'whatsapp' | 'visio';

export type LabeledOption<T extends string = string> = {
    value: T;
    label: string;
};

/** Ligne de la liste des leads. */
export type Lead = {
    id: number;
    /** Identifiant public, utilisé dans les URL. */
    uuid: string;
    /** Référence publique « LD-XXXX ». */
    reference: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    language: LeadLanguage;
    language_label: string;
    offer: OfferValue | null;
    offer_label: string | null;
    arrival_at: string | null;
    budget_cents: number | null;
    currency: Currency;
    origin_city: string | null;
    source_label: string;
    source_note: string | null;
    /** Arrondissements visés (1 à 20). */
    districts: number[];
    property_types: LabeledOption<PropertyType>[];
    duration_label: string | null;
    guarantor_label: string | null;
    furnished_label: string | null;
    message: string | null;
    recontact_channel: RecontactChannel | null;
    recontact_channel_label: string | null;
    recontact_at: string | null;
    qualification_note: string | null;
    /** Qualité estimée, de 1 à 5. */
    score: number | null;
    status: LeadStatus;
    status_label: string;
    /** Motif d'archivage, présent seulement sur un lead archivé. */
    loss_reason: LeadLossReason | null;
    loss_reason_label: string | null;
    loss_note: string | null;
    /** Ordre manuel dans la colonne du kanban. */
    position: number;
    last_contacted_at: string | null;
    /** Appel vidéo programmé (ISO), et son lien Google Meet. */
    visio_at: string | null;
    visio_meet_link: string | null;
    created_at: string | null;
    /** Membre du staff qui a créé la fiche. */
    author: { id: number; name: string; avatar: string | null } | null;
    /** Membre du staff responsable du suivi. */
    assignee: { id: number; name: string; avatar: string | null } | null;
};

export type LeadStatusOption = { value: LeadStatus; label: string };

/** Éléments qu'on peut envoyer à un lead par e-mail depuis sa fiche. */
export type LeadMailItem = 'recap' | 'payment_link' | 'contract_link';

/** Ce que la fiche autorise à envoyer, selon l'e-mail du lead et les services configurés. */
export type LeadSending = {
    email: boolean;
    paymentLink: boolean;
    contractLink: boolean;
    /** Modalités de paiement proposées pour la formule du lead (vide sans formule). */
    paymentPlans: { value: PaymentPlan; label: string }[];
};

/** Paiement en totalité ou acompte de 50 % (offre Confié seulement). */
export type PaymentPlan = 'full' | 'deposit';

/** Formulaire « Converting Machine » : chaînes tant que l'utilisateur saisit. */
export type LeadForm = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    language: LeadLanguage;
    offer: OfferValue | '';
    source: LeadSource;
    source_note: string;
    budget: string;
    currency: Currency;
    arrival_at: string;
    origin_city: string;
    districts: number[];
    property_types: PropertyType[];
    duration: LeadDuration | '';
    guarantors: GuarantorType[];
    furnished: Furnished | '';
    message: string;
    score: number | null;
    recontact_channel: RecontactChannel | '';
    recontact_at: string;
    qualification_note: string;
    /** Responsable du suivi, pré-rempli avec l'utilisateur courant. */
    assigned_to: number | null;
};

export type LeadDetail = Lead & {
    first_name: string;
    last_name: string;
    source: LeadSource;
    updated_at: string | null;
    /** Agent immobilier en contact sur ce dossier. */
    agent: LeadAgent | null;
};

export type LeadAgent = {
    id: number;
    uuid: string;
    name: string;
    agency: string | null;
    position: string | null;
    phone: string | null;
    email: string | null;
};

export type LeadNote = {
    id: number;
    uuid: string;
    body: string;
    by: string | null;
    /** URL de l'avatar de l'auteur, si renseigné. */
    avatar: string | null;
    /** Note écrite par l'utilisateur connecté (bulle à droite). */
    mine: boolean;
    /** Encore modifiable par moi (auteur, dans le délai). */
    can_edit: boolean;
    /** Supprimable par moi (auteur dans le délai, ou admin). */
    can_delete: boolean;
    at: string | null;
};

/**
 * Ce que le lead nous a dit en arrivant : message du formulaire du site,
 * résumé du premier appel entrant ou texte du premier SMS reçu.
 */
export type LeadInboundMessage = {
    kind: 'website' | 'call' | 'sms';
    body: string;
    /** Contexte court : formulaire et référence, ou durée et issue de l'appel. */
    meta: string;
    at: string | null;
};

/** Autre lead partageant l'e-mail ou le téléphone. */
export type LeadDuplicate = {
    id: number;
    uuid: string;
    name: string;
    email: string | null;
    phone: string | null;
    status_label: string;
    url: string;
};

export type LeadStatusChange = {
    id: number;
    from: string | null;
    to: string;
    to_status: LeadStatus;
    by: string | null;
    at: string;
};

export type LeadOfferOption = {
    value: OfferValue;
    label: string;
    description: string;
    /** Une phrase qui décrit la formule. */
    summary: string;
    price_cents: number;
};

/** Lead pré-rempli pour la modification (Converting Machine en mode édition). */
export type LeadEditable = LeadForm & {
    id: number;
    uuid: string;
    name: string;
};

export type LeadSortKey = 'manual' | 'score' | 'arrival' | 'created';

/** Tous, non attribués, ou l'identifiant d'un membre du staff. */
export type LeadAssigneeFilter = 'all' | 'none' | number;
