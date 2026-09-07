import type { Owner, OwnerLead, OwnerStatusOption } from '@/types';

/** Miroir de OwnerStatus::options(). */
export const ownerStatuses: OwnerStatusOption[] = [
    { value: 'to_contact', label: 'À contacter' },
    { value: 'contacted', label: 'Contacté' },
    { value: 'interested', label: 'Intéressé' },
    { value: 'mandate', label: 'Mandat signé' },
    { value: 'declined', label: 'Pas intéressé' },
];

export function makeOwner(overrides: Partial<Owner> = {}): Owner {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000d1',
        first_name: 'Zoé',
        last_name: 'Martin',
        name: 'Zoé Martin',
        company: null,
        email: 'zoe@example.com',
        phone: '+33 6 12 34 56 78',
        street: '8 rue de Rivoli',
        postal_code: '75004',
        city: 'Paris',
        property_count: 2,
        status: 'to_contact',
        status_label: 'À contacter',
        last_contacted_at: null,
        notes: null,
        lead: null,
        creator: 'Admin',
        creator_avatar: null,
        created_at: '2026-09-06T10:00:00+00:00',
        ...overrides,
    };
}

export function makeOwnerLead(overrides: Partial<OwnerLead> = {}): OwnerLead {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000e1',
        reference: 'LD-0042',
        name: 'Paul Roux',
        company: null,
        email: 'paul@example.com',
        phone: null,
        status: 'todo',
        status_label: 'À traiter',
        source_label: 'Site web',
        source_note: 'Formulaire de contact · Gestion locative · CT-000123',
        assignee: 'Charles',
        assignee_avatar: null,
        last_contacted_at: null,
        created_at: '2026-09-07T09:00:00+00:00',
        ...overrides,
    };
}
