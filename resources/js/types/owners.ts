/** Nature d'un propriétaire : particulier, ou société qui détient le bien. */
export type OwnerKind = 'individual' | 'company';

export type OwnerKindOption = {
    value: OwnerKind;
    label: string;
    hint: string;
};

/** Propriétaire de l'annuaire : qui possède quoi. */
export type Owner = {
    id: number;
    uuid: string;
    kind: OwnerKind;
    kind_label: string;
    first_name: string;
    last_name: string;
    /** Nom affiché : la personne, ou la raison sociale d'une société. */
    name: string;
    /** Interlocuteur d'une société, quand il est renseigné. */
    contact_name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    /** Biens de l'annuaire rattachés à ce propriétaire. */
    properties_count: number;
    notes: string | null;
    /** Dernier échange noté, pour repérer les propriétaires oubliés. */
    last_contacted_at: string | null;
    /** Lead propriétaire d'où vient la fiche, quand elle en vient. */
    lead: OwnerLeadLink | null;
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

/** Lead propriétaire rattaché à une fiche de l'annuaire. */
export type OwnerLeadLink = {
    id: number;
    uuid: string;
    name: string;
    reference: string | null;
    status_label: string;
    assignee: string | null;
};

/** Parc d'un propriétaire, en trois chiffres. */
export type OwnerParcStats = {
    properties: number;
    open: number;
    rented: number;
    rent_cents: number;
    last_visit_at: string | null;
};

/** Une ligne de propriétaire collée depuis un tableur. */
export type OwnerImportRow = {
    first_name: string;
    last_name: string;
    company: string;
    email: string;
    phone: string;
    street: string;
    postal_code: string;
    city: string;
};

export type OwnerForm = {
    kind: OwnerKind;
    first_name: string;
    last_name: string;
    company: string;
    email: string;
    phone: string;
    street: string;
    postal_code: string;
    city: string;
    notes: string;
};

/* ---------- Leads propriétaires : bien proposé (Converting Machine propriétaire) ---------- */

import type { LeadLanguage, LeadSource } from './leads';

export type OwnerPropertyType =
    | 'studio'
    | 't1'
    | 't2'
    | 't3'
    | 't4'
    | 'large_apartment'
    | 'duplex'
    | 'loft'
    | 'house';

/** Disponibilité d'un bien (annuaire « Biens » et bien proposé par un lead propriétaire). */
export type PropertyStatus =
    | 'available'
    | 'under_offer'
    | 'rented'
    | 'under_renovation'
    | 'unavailable';

/** Étage d'un bien : liste fermée, « et plus » au-delà du 7e, plus « Dernier étage ». */
export type PropertyFloor =
    | 'ground'
    | '1'
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | 'above'
    | 'top';

export type LeaseType =
    | 'alur'
    | 'civil_code'
    | 'mobility'
    | 'airbnb'
    | 'no_idea';

export type Orientation = 'north' | 'south' | 'east' | 'west';

export type PropertyAmenity =
    | 'elevator'
    | 'balcony'
    | 'terrace'
    | 'wifi'
    | 'washing_machine'
    | 'dishwasher'
    | 'oven'
    | 'tv'
    | 'air_conditioning'
    | 'parking'
    | 'cellar'
    | 'garden'
    | 'dryer'
    | 'microwave'
    | 'bathtub'
    | 'intercom'
    | 'concierge'
    | 'natural_light'
    | 'double_glazing'
    | 'wheelchair_access'
    | 'bike_storage'
    | 'workspace'
    | 'gym'
    | 'pool';

/** Meublé ou vide, tel que saisi pour un bien proposé. */
export type PropertyFurnishing = 'furnished' | 'unfurnished';

/** Bien proposé par un propriétaire, tel qu'enregistré (`lead_properties`). */
export type LeadProperty = {
    address: string | null;
    place_id: string | null;
    property_type: OwnerPropertyType | null;
    property_status: PropertyStatus | null;
    bedrooms: number | null;
    bathrooms: number | null;
    surface: number | null;
    floor: number | null;
    building_floors: number | null;
    furnishing: PropertyFurnishing | null;
    orientations: Orientation[];
    lease_types: LeaseType[];
    rent_cents: number | null;
    charges_cents: number | null;
    deposit_cents: number | null;
    amenities: PropertyAmenity[];
    note: string | null;
};

/** Le bien avec ses libellés, pour la fiche lead. */
export type LeadPropertyDetail = LeadProperty & {
    property_type_label: string | null;
    property_status_label: string | null;
    furnishing_label: string | null;
    orientation_labels: string[];
    lease_type_labels: string[];
    amenity_labels: string[];
};

/** Formulaire de la Converting Machine propriétaire : les nombres saisis restent des chaînes. */
export type OwnerLeadForm = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    language: LeadLanguage;
    source: LeadSource;
    source_note: string;
    assigned_to: number | null;
    property: {
        address: string;
        place_id: string;
        property_type: OwnerPropertyType | '';
        property_status: PropertyStatus | '';
        bedrooms: number | null;
        bathrooms: number | null;
        surface: string;
        floor: string;
        building_floors: string;
        furnishing: PropertyFurnishing | '';
        orientations: Orientation[];
        lease_types: LeaseType[];
        /** Montants en euros, tels que saisis. */
        rent: string;
        charges: string;
        deposit: string;
        amenities: PropertyAmenity[];
        note: string;
    };
};

/** Lead propriétaire tel que reçu par la page en mode modification. */
export type OwnerLeadEditable = {
    id: number;
    uuid: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    language: LeadLanguage;
    source: LeadSource;
    source_note: string;
    assigned_to: number | null;
    property: LeadProperty | null;
};
