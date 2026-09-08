import type {
    Currency,
    Furnished,
    LeaseType,
    PropertyType,
    VisitStatus,
} from '@/types';

/** Bien de l'annuaire « Biens » : un logement que l'équipe peut proposer et faire visiter. */
export type Property = {
    id: number;
    uuid: string;
    title: string | null;
    /** Titre saisi, sinon l'adresse. */
    label: string;
    street: string;
    postal_code: string | null;
    city: string | null;
    /** Arrondissement (1 à 20), déduit du code postal 750XX si absent. */
    district: number | null;
    property_type: PropertyType | null;
    property_type_label: string | null;
    furnished: Furnished | null;
    furnished_label: string | null;
    rooms: number | null;
    surface_m2: number | null;
    /** Étage (0 = rez-de-chaussée). */
    floor: number | null;
    lease_type: LeaseType | null;
    lease_type_label: string | null;
    rent_cents: number | null;
    charges_cents: number | null;
    currency: Currency;
    listing_url: string | null;
    agent: {
        id: number;
        uuid: string;
        name: string;
        agency: string | null;
    } | null;
    owner: { id: number; uuid: string; name: string } | null;
    /** URL publiques des photos. */
    photos: string[];
    notes: string | null;
    visits_count: number;
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

/** Champs texte du formulaire d'un bien (unités saisies, centimes envoyés). */
export type PropertyForm = {
    title: string;
    street: string;
    postal_code: string;
    city: string;
    district: string;
    property_type: PropertyType | '';
    furnished: Furnished | '';
    rooms: string;
    surface_m2: string;
    floor: string;
    lease_type: LeaseType | '';
    /** Loyer mensuel en unités (ex. « 1500 »). */
    rent: string;
    /** Charges mensuelles en unités. */
    charges: string;
    currency: Currency;
    listing_url: string;
    agent_id: string;
    owner_id: string;
    notes: string;
};

export type PropertyAgentOption = {
    id: number;
    name: string;
    agency: string | null;
};
export type PropertyOwnerOption = { id: number; name: string };

/** Listes du formulaire d'un bien, partagées avec les visites. */
export type PropertyFormOptions = {
    propertyTypes: { value: PropertyType; label: string }[];
    furnishedOptions: { value: Furnished; label: string }[];
    leaseTypes: { value: LeaseType; label: string }[];
    currencies: Currency[];
    agents: PropertyAgentOption[];
    owners: PropertyOwnerOption[];
};

/** Visite d'un bien, telle qu'affichée sur sa fiche. */
export type PropertyVisit = {
    id: number;
    uuid: string;
    scheduled_at: string;
    status: VisitStatus;
    status_label: string;
    client: { uuid: string; name: string; reference: string | null };
    agent: string | null;
};
