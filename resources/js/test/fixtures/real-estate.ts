import type { Agency, AgencyOption, Agent } from '@/types';

/** Miroir de RealEstateSeeder : agences parisiennes et agents rattachés ou indépendants. */
export function makeAgency(overrides: Partial<Agency> = {}): Agency {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000a1',
        name: 'Agence du Marais',
        street: '12 rue de Turenne',
        postal_code: '75003',
        city: 'Paris',
        phone: '+33 1 42 00 00 00',
        email: 'contact@marais.example',
        website: 'https://marais.example',
        notes: null,
        agents_count: 2,
        agents: [
            {
                id: 1,
                uuid: '0199a9a0-0000-7000-8000-0000000000b1',
                name: 'Zoé Martin',
                position: 'Négociatrice',
                phone: '+33 6 12 34 56 78',
                email: 'zoe@marais.example',
            },
            {
                id: 2,
                uuid: '0199a9a0-0000-7000-8000-0000000000b2',
                name: 'Paul Roux',
                position: null,
                phone: null,
                email: null,
            },
        ],
        creator: 'Admin',
        creator_avatar: null,
        created_at: '2026-09-06T10:00:00+00:00',
        ...overrides,
    };
}

export const agencyOptions: AgencyOption[] = [
    {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000a1',
        name: 'Agence du Marais',
    },
    {
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000a2',
        name: 'Bureau Paris Ouest',
    },
];

export function makeAgent(overrides: Partial<Agent> = {}): Agent {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000b1',
        first_name: 'Zoé',
        last_name: 'Martin',
        name: 'Zoé Martin',
        position: 'Négociateur',
        position_value: 'negotiator',
        street: null,
        postal_code: null,
        city: null,
        email: 'zoe@marais.example',
        phone: '+33 6 12 34 56 78',
        notes: null,
        agency: {
            id: 1,
            uuid: '0199a9a0-0000-7000-8000-0000000000a1',
            name: 'Agence du Marais',
        },
        leads: [],
        creator: 'Admin',
        creator_avatar: null,
        created_at: '2026-09-06T10:00:00+00:00',
        ...overrides,
    };
}
