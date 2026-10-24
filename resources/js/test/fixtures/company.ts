import type {
    CompanyEntry,
    CompanyClient,
    CompanyClientOption,
    CompanyContact,
    CompanyDetail,
} from '@/types';

export function makeCompanyContact(
    overrides: Partial<CompanyContact> = {},
): CompanyContact {
    return {
        id: 1,
        first_name: 'Marie',
        last_name: 'Durand',
        name: 'Marie Durand',
        position: 'Directeur',
        position_value: 'director',
        is_primary: true,
        email: 'marie@zen.example',
        phone: '+33 6 12 34 56 78',
        ...overrides,
    };
}

export function makeCompany(
    overrides: Partial<CompanyEntry> = {},
): CompanyEntry {
    return {
        id: 1,
        uuid: '0199c0c0-0000-7000-8000-0000000000e1',
        name: 'Zen Conseil',
        email: 'rh@zen.example',
        phone: '+33 1 42 00 11 22',
        website: 'https://zen.example',
        street: '8 rue de Rivoli',
        postal_code: '75004',
        city: 'Paris',
        notes: null,
        logo: null,
        contacts: [
            makeCompanyContact(),
            makeCompanyContact({
                id: 2,
                first_name: 'Paul',
                last_name: 'Martin',
                name: 'Paul Martin',
                position: 'Assistant',
                position_value: 'assistant',
                is_primary: false,
                email: 'paul@zen.example',
                phone: null,
            }),
        ],
        primary_contacts_count: 1,
        clients_count: 1,
        creator: 'Admin',
        creator_avatar: null,
        created_at: '2026-09-01T10:00:00+02:00',
        ...overrides,
    };
}

export function makeCompanyClient(
    overrides: Partial<CompanyClient> = {},
): CompanyClient {
    return {
        id: 5,
        uuid: '0199c0c0-0000-7000-8000-0000000000a5',
        name: 'Léa Durand',
        reference: 'LD-1234',
        status_label: 'Converti',
        is_closed: false,
        offer: 'confie',
        offer_label: 'Confié',
        arrival_at: '2026-11-15',
        assignee: 'Charles',
        ...overrides,
    };
}

export function makeCompanyClientOption(
    overrides: Partial<CompanyClientOption> = {},
): CompanyClientOption {
    return {
        id: 9,
        uuid: '0199c0c0-0000-7000-8000-0000000000a9',
        name: 'Paul Martin',
        reference: 'LD-5678',
        company: null,
        ...overrides,
    };
}

export function makeCompanyDetail(
    overrides: Partial<CompanyDetail> = {},
): CompanyDetail {
    return {
        ...makeCompany(),
        clients: [makeCompanyClient()],
        ...overrides,
    };
}
