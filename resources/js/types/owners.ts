import type { LeadStatus } from './leads';

export type OwnerStatus =
    | 'to_contact'
    | 'contacted'
    | 'interested'
    | 'mandate'
    | 'declined';

export type OwnerStatusOption = { value: OwnerStatus; label: string };

/** Propriétaire à prospecter pour la gestion locative. */
export type Owner = {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    property_count: number;
    status: OwnerStatus;
    status_label: string;
    last_contacted_at: string | null;
    notes: string | null;
    /** Lead « gestion locative » créé depuis ce propriétaire, ou null. */
    lead: { uuid: string; reference: string; status_label: string } | null;
    creator: string | null;
    creator_avatar: string | null;
    created_at: string | null;
};

export type OwnerForm = {
    first_name: string;
    last_name: string;
    company: string;
    email: string;
    phone: string;
    street: string;
    postal_code: string;
    city: string;
    property_count: string;
    status: OwnerStatus;
    notes: string;
};

/** Lead propriétaire (demande de gestion locative), vu depuis la liste dédiée. */
export type OwnerLead = {
    id: number;
    uuid: string;
    reference: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    status: LeadStatus;
    status_label: string;
    source_label: string;
    source_note: string | null;
    assignee: string | null;
    assignee_avatar: string | null;
    last_contacted_at: string | null;
    created_at: string | null;
};
