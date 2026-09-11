import type { OwnerKindOption } from '@/types/owners';
import type { AgencyOption } from '@/types/real-estate';
import type { LabeledOption } from '@/types';
import type { PartnerType } from '@/types/partners';
import type { Orientation, PropertyAmenity } from '@/types/owners';
import type {
    Currency,
    Furnished,
    LeaseType,
    PropertyFloor,
    PropertyStatus,
    PropertyType,
    VisitStatus,
} from '@/types';

/** Nature d'un arrêt proche d'un bien, miroir de `App\Enums\TransitKind`. */
export type TransitKind = 'metro' | 'rer' | 'tram' | 'bus';

/** Arrêt de transport proche d'un bien, proposé par l'assistant puis relu. */
export type TransitStop = {
    kind: TransitKind;
    name: string;
    lines: string[];
    /** Temps de marche estimé, quand l'assistant a su le donner. */
    minutes: number | null;
};

/** Bien de l'annuaire « Biens » : un logement que l'équipe peut proposer et faire visiter. */
export type Property = {
    id: number;
    uuid: string;
    /** Nom calculé du bien : jamais saisi à la main. */
    title: string | null;
    /** Titre saisi, sinon l'adresse. */
    label: string;
    street: string;
    postal_code: string | null;
    city: string | null;
    /** Arrondissement (1 à 20), déduit du code postal 750XX si absent. */
    district: number | null;
    /** Partenaire rattaché au bien (gestion, assurance, déménagement…). */
    partner: { id: number; uuid: string; name: string; type: string } | null;
    /** Transports proches enregistrés sur le bien. */
    transit: TransitStop[];
    /** Disponibilité du bien. */
    status: PropertyStatus;
    status_label: string;
    property_type: PropertyType | null;
    property_type_label: string | null;
    furnished: Furnished | null;
    furnished_label: string | null;
    rooms: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    surface_m2: number | null;
    /** Étage (0 = rez-de-chaussée). */
    floor: PropertyFloor | null;
    floor_label: string | null;
    /** Nombre d'étages de l'immeuble. */
    building_floors: number | null;
    orientations: Orientation[];
    orientation_labels: string[];
    /** Équipements du bien, alignés sur le formulaire « Proposer un bien ». */
    amenities: PropertyAmenity[];
    amenity_labels: string[];
    lease_type: LeaseType | null;
    lease_type_label: string | null;
    rent_cents: number | null;
    charges_cents: number | null;
    /** Le loyer affiché comprend déjà les charges. */
    charges_included: boolean;
    /** Dépôt de garantie en centimes. */
    deposit_cents: number | null;
    currency: Currency;
    listing_url: string | null;
    agent: {
        id: number;
        uuid: string;
        name: string;
        agency: string | null;
    } | null;
    owner: { id: number; uuid: string; name: string } | null;
    /** Client à qui le bien est attribué : il est pris, plus proposé en visite. */
    assigned_lead: { uuid: string; name: string } | null;
    assigned_at: string | null;
    /** URL publiques des photos. */
    photos: string[];
    /** Chemins des photos sur le disque, renvoyés à la modification. */
    photo_paths: string[];
    notes: string | null;
    visits_count: number;
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

/** Champs texte du formulaire d'un bien (unités saisies, centimes envoyés). */
export type PropertyForm = {
    street: string;
    postal_code: string;
    city: string;
    district: string;
    status: PropertyStatus;
    property_type: PropertyType | '';
    furnished: Furnished | '';
    rooms: string;
    bedrooms: string;
    bathrooms: string;
    surface_m2: string;
    floor: string;
    building_floors: string;
    orientations: Orientation[];
    amenities: PropertyAmenity[];
    transit: TransitStop[];
    lease_type: LeaseType | '';
    /** Loyer mensuel en unités (ex. « 1500 »). */
    rent: string;
    /** Charges mensuelles en unités. */
    charges: string;
    charges_included: boolean;
    /** Dépôt de garantie en unités. */
    deposit: string;
    currency: Currency;
    listing_url: string;
    agent_id: string;
    owner_id: string;
    partner_id: string;
    notes: string;
};

export type PropertyAgentOption = {
    id: number;
    name: string;
    agency: string | null;
};
export type PropertyOwnerOption = { id: number; name: string };

/** Partenaire proposé sur un bien : son nom et son type en indice. */
export type PropertyPartnerOption = { id: number; name: string; type: string };

/** Listes du formulaire d'un bien, partagées avec les visites. */
export type PropertyFormOptions = {
    propertyTypes: { value: PropertyType; label: string }[];
    propertyStatuses: { value: PropertyStatus; label: string }[];
    furnishedOptions: { value: Furnished; label: string }[];
    leaseTypes: { value: LeaseType; label: string }[];
    floors: { value: PropertyFloor; label: string }[];
    orientations: LabeledOption<Orientation>[];
    amenities: LabeledOption<PropertyAmenity>[];
    currencies: Currency[];
    agents: PropertyAgentOption[];
    owners: PropertyOwnerOption[];
    partners: PropertyPartnerOption[];
    /** Pour les dialogues « Nouvel agent » et « Nouveau propriétaire » du formulaire. */
    agencies: AgencyOption[];
    ownerKinds: OwnerKindOption[];
    partnerTypes: LabeledOption<PartnerType>[];
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

/** Dossier client auquel le bien a été attribué (pivot `lead_property`). */
export type PropertyClient = {
    id: number;
    uuid: string;
    name: string;
    reference: string | null;
};
