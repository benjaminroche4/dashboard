import type {
    Partner,
    PartnerContact,
    PartnerDetail,
    PartnerRoleOption,
    PartnerTypeOption,
} from '@/types';

/** Miroir de PartnerType::options(). */
export const partnerTypes: PartnerTypeOption[] = [
    { value: 'management', label: 'Gestion' },
    { value: 'insurance', label: 'Assurance' },
    { value: 'bank', label: 'Banque' },
    { value: 'mover', label: 'Déménagement' },
    { value: 'partnership', label: 'Partenariat' },
    { value: 'other', label: 'Autre' },
];

export const partnerRoles: PartnerRoleOption[] = [
    { value: 'guarantee', label: 'Garantie' },
    { value: 'home_insurance', label: 'Assurance habitation' },
    { value: 'moving', label: 'Déménagement' },
    { value: 'bank_account', label: 'Compte bancaire' },
    { value: 'management', label: 'Gestion locative' },
    { value: 'other', label: 'Autre' },
];

export function makePartnerContact(
    overrides: Partial<PartnerContact> = {},
): PartnerContact {
    return {
        id: 1,
        first_name: 'Marie',
        last_name: 'Durand',
        name: 'Marie Durand',
        position: 'Commercial',
        position_value: 'sales',
        is_primary: false,
        email: 'marie@zen.example',
        phone: '+33 6 12 34 56 78',
        ...overrides,
    };
}

export function makePartnerDetail(
    overrides: Partial<PartnerDetail> = {},
): PartnerDetail {
    return {
        ...makePartner(),
        leads: [],
        contacts_count: 1,
        primary_contact: {
            id: 1,
            name: 'Marie Durand',
            position: 'Commerciale',
            email: 'marie@zen.example',
            phone: '+33 6 12 34 56 78',
        },
        roles: [],
        ...overrides,
    };
}

export function makePartner(overrides: Partial<Partner> = {}): Partner {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000c1',
        name: 'Zen Assurances',
        type: 'insurance',
        type_label: 'Assurance',
        email: 'contact@zen.example',
        phone: '+33 1 42 00 11 22',
        website: 'https://zen.example',
        street: '8 rue de Rivoli',
        postal_code: '75004',
        city: 'Paris',
        notes: null,
        relationship_quality: null,
        relationship_quality_label: null,
        last_contacted_at: null,
        latitude: null,
        longitude: null,
        is_favorite: false,
        contacts: [makePartnerContact()],
        leads_count: 0,
        creator: 'Admin',
        creator_avatar: null,
        created_at: '2026-09-06T10:00:00+00:00',
        ...overrides,
    };
}
