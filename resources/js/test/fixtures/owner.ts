import type { Owner, OwnerKindOption } from '@/types';

/** Miroir de OwnerKind::options(). */
export const ownerKinds: OwnerKindOption[] = [
    {
        value: 'individual',
        label: 'Particulier',
        hint: 'Une personne physique, propriétaire en son nom.',
    },
    {
        value: 'company',
        label: 'Société ou agence',
        hint: 'Une SCI, une agence ou une foncière ; l’interlocuteur reste facultatif.',
    },
];

export function makeOwner(overrides: Partial<Owner> = {}): Owner {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000d1',
        kind: 'individual',
        kind_label: 'Particulier',
        first_name: 'Zoé',
        last_name: 'Martin',
        name: 'Zoé Martin',
        contact_name: null,
        company: null,
        email: 'zoe@example.com',
        phone: '+33 6 12 34 56 78',
        street: '8 rue de Rivoli',
        postal_code: '75004',
        city: 'Paris',
        properties_count: 2,
        notes: null,
        last_contacted_at: null,
        lead: null,
        creator: 'Admin',
        creator_avatar: null,
        created_at: '2026-09-06T10:00:00+00:00',
        ...overrides,
    };
}
