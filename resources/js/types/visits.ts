import type { Currency, OfferValue } from '@/types';

export type VisitStatus = 'planned' | 'done' | 'cancelled';

export type VisitStatusOption = { value: VisitStatus; label: string };

/** Façon de visiter : l'équipe pour le client, ou le client seul. */
export type VisitModeValue = 'for_client' | 'client_alone';

export type VisitModeOption = {
    value: VisitModeValue;
    label: string;
    hint: string;
};

/** Visite d'un bien par un client, à une date donnée. */
export type Visit = {
    id: number;
    uuid: string;
    scheduled_at: string;
    status: VisitStatus;
    status_label: string;
    /** Visite faite par l'équipe pour le client, ou visite autonome du client. */
    mode: VisitModeValue;
    mode_label: string;
    notes: string | null;
    /** Compte rendu rédigé après la visite. */
    report: string | null;
    /** URL publiques des photos prises pendant la visite. */
    report_photos: string[];
    report_submitted_at: string | null;
    report_author: string | null;
    /** Visite passée, non annulée, sans compte rendu : à rédiger. */
    report_due: boolean;
    client: {
        id: number;
        uuid: string;
        name: string;
        reference: string | null;
        /** Formule du client : « Confié » = l'équipe visite sans lui. */
        offer: OfferValue | null;
        offer_label: string | null;
    };
    property: {
        id: number;
        uuid: string;
        label: string;
        street: string;
        postal_code: string | null;
        city: string | null;
        /** Arrondissement (1 à 20), pour placer une adresse non géocodée au centre du quartier. */
        district: number | null;
        /** Position géocodée, null si l'adresse n'a pas été localisée. */
        latitude: number | null;
        longitude: number | null;
        /** Première photo du bien, pour la vignette des listes. */
        photo: string | null;
        rent_cents: number | null;
        currency: Currency;
    };
    agent: {
        id: number;
        uuid: string;
        name: string;
        agency: string | null;
    } | null;
    /** Membre de l'équipe qui réalise la visite. */
    assignee: { id: number; name: string; avatar: string | null } | null;
    creator: string | null;
    creator_avatar: string | null;
};

/** Fiche d'une visite : la visite et le détail du bien visité. */
export type VisitDetail = Visit & {
    created_at: string | null;
    property: Visit['property'] & {
        property_type_label: string | null;
        furnished_label: string | null;
        rooms: number | null;
        surface_m2: number | null;
        floor_label: string | null;
        charges_cents: number | null;
        listing_url: string | null;
        photos: string[];
        owner: { uuid: string; name: string } | null;
    };
};

/** Client sélectionnable pour une visite (lead converti). */
export type VisitClientOption = {
    id: number;
    uuid: string;
    name: string;
    reference: string | null;
    /** Formule du client : sur « Confié », l'équipe visite sans lui. */
    offer: OfferValue | null;
    offer_label: string | null;
};

/** Bien de l'annuaire sélectionnable pour une visite. */
export type VisitPropertyOption = {
    id: number;
    label: string;
    street: string;
    postal_code: string | null;
    city: string | null;
    /** Photo principale (première photo), pour la vignette de la liste. */
    photo?: string | null;
};
