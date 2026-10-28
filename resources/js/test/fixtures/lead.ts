import type {
    Lead,
    LeadDetail,
    LeadEditOptions,
    LeadInboundMessage,
    LeadPeople,
    LeadPerson,
    LeadProperty,
    LeadPropertyDetail,
    LeadPropertyOptions,
    LeadStatusOption,
    LeadVerdictInfo,
    OwnerLeadEditable,
} from '@/types';

/** Miroir de LeadFactory : lead nouveau, offre Accompagné, budget 2 500 EUR. */
export function makeLead(overrides: Partial<Lead> = {}): Lead {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-000000000001',
        reference: 'LD-4821',
        name: 'Léa Durand',
        email: 'lea@example.com',
        phone: '+33 6 00 00 00 00',
        company: null,
        language: 'fr',
        language_label: 'Français',
        offer: 'accompagne',
        offer_label: 'Accompagné',
        arrival_at: '2026-11-01',
        budget_cents: 250_000,
        currency: 'EUR',
        origin_city: 'Genève',
        origin_country: 'CH',
        employment_status: null,
        employment_status_label: null,
        project_notes: null,
        source_label: 'Recommandation',
        source_note: null,
        districts: [3, 4],
        property_types: [{ value: 't2', label: 'T2' }],
        duration: 'long',
        duration_label: 'Long terme · 12 mois et plus',
        guarantors: [],
        guarantor_label: null,
        furnished: 'furnished',
        furnished_label: 'Meublé',
        recontact_channel: null,
        recontact_channel_label: null,
        recontact_at: null,
        qualification_note: null,
        message: 'Arrive avec sa famille, cherche un 3 pièces.',
        score: 4,
        status: 'todo',
        status_label: 'À traiter',
        segment: 'tenant',
        ai_verdict: null,
        ai_verdict_label: null,
        loss_reason: null,
        loss_reason_label: null,
        loss_note: null,
        position: 0,
        last_contacted_at: null,
        visio_at: null,
        visio_meet_link: null,
        visio_report: null,
        visio_report_submitted_at: null,
        visio_report_due: false,
        created_at: '2026-09-04T10:00:00+00:00',
        author: { id: 1, name: 'Admin', avatar: null },
        assignee: null,
        ...overrides,
    } as Lead;
}

export const leadStatuses: LeadStatusOption[] = [
    { value: 'todo', label: 'À traiter' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'quote_sent', label: 'Devis envoyé' },
    { value: 'converted', label: 'Converti' },
    { value: 'archived', label: 'Archivé' },
];

export function makeLeadDetail(
    overrides: Partial<LeadDetail> = {},
): LeadDetail {
    return {
        ...makeLead(),
        first_name: 'Léa',
        last_name: 'Durand',
        source: 'referral',
        updated_at: '2026-09-04T10:00:00+00:00',
        agent: null,
        ...overrides,
    } as LeadDetail;
}

export const leadEditOptions: LeadEditOptions = {
    offers: [
        { value: 'accompagne', label: 'Accompagné' },
        { value: 'confie', label: 'Confié' },
    ],
    currencies: [
        { value: 'EUR', label: 'Euro' },
        { value: 'CHF', label: 'Franc suisse' },
    ],
    propertyTypes: [
        { value: 'studio', label: 'Studio' },
        { value: 't2', label: 'T2' },
        { value: 'loft', label: 'Loft' },
    ],
    durations: [
        { value: 'short', label: 'Court terme' },
        { value: 'long', label: 'Long terme · 12 mois et plus' },
    ],
    guarantors: [
        { value: 'physique', label: 'Garant physique' },
        { value: 'garantme', label: 'Garantme' },
    ],
    furnishedOptions: [
        { value: 'furnished', label: 'Meublé' },
        { value: 'unfurnished', label: 'Vide' },
    ],
    employmentStatuses: [
        { value: 'cdi', label: 'CDI' },
        { value: 'etudiant', label: 'Étudiant' },
    ],
    languages: [
        { value: 'fr', label: 'Français' },
        { value: 'en', label: 'Anglais' },
    ],
    sources: [
        { value: 'website', label: 'Site web' },
        { value: 'referral', label: 'Recommandation' },
    ],
};

export function makeInbound(
    overrides: Partial<LeadInboundMessage> = {},
): LeadInboundMessage {
    return {
        kind: 'website',
        body: "Bonjour, j'arrive à Paris en octobre avec ma famille.",
        meta: 'Formulaire de contact · Recherche de logement · CT-4F2A11',
        at: '2026-09-06T17:03:00+02:00',
        topic: 'Recherche de logement',
        ...overrides,
    };
}

export const lossReasons = [
    { value: 'not_qualified' as const, label: 'Pas du tout qualifié' },
    { value: 'bad_closing' as const, label: 'Mauvais closing' },
    { value: 'small_budget' as const, label: 'Trop petit budget' },
    { value: 'tight_timing' as const, label: 'Timing trop serré' },
    { value: 'other' as const, label: 'Autre' },
];

/** Miroir de LeadPropertyFactory : T2 meublé de 42 m² au 3e sur 6, loyer 1 450 € HC. */
export function makeLeadProperty(
    overrides: Partial<LeadProperty> = {},
): LeadProperty {
    return {
        address: '12 rue de Rivoli, 75004 Paris',
        place_id: null,
        latitude: 48.8556,
        longitude: 2.36,
        property_type: 't2',
        property_status: 'available',
        bedrooms: 1,
        bathrooms: 1,
        surface: 42,
        floor: 3,
        building_floors: 6,
        furnishing: 'furnished',
        orientations: ['south', 'west'],
        lease_types: ['alur', 'mobility'],
        rent_cents: 145_000,
        charges_cents: 12_000,
        deposit_cents: 290_000,
        amenities: ['elevator', 'balcony'],
        note: 'Visites possibles le samedi matin.',
        ...overrides,
    };
}

/** Le bien avec ses libellés, comme la fiche lead le reçoit. */
export function makeLeadPropertyDetail(
    overrides: Partial<LeadPropertyDetail> = {},
): LeadPropertyDetail {
    return {
        ...makeLeadProperty(),
        property_type_label: 'T2',
        property_status_label: 'Disponible',
        furnishing_label: 'Meublé',
        orientation_labels: ['Sud', 'Ouest'],
        lease_type_labels: ['Loi Alur', 'Bail mobilité'],
        amenity_labels: ['Ascenseur', 'Balcon'],
        ...overrides,
    };
}

/** Listes du bien proposé, telles que la fiche lead les reçoit (`propertyOptions`). */
export function makeLeadPropertyOptions(): LeadPropertyOptions {
    return {
        propertyTypes: [
            { value: 'studio', label: 'Studio' },
            { value: 't2', label: 'T2' },
            { value: 't3', label: 'T3' },
        ],
        propertyStatuses: [
            { value: 'available', label: 'Disponible' },
            { value: 'rented', label: 'Loué' },
        ],
        leaseTypes: [
            { value: 'alur', label: 'Loi Alur' },
            { value: 'mobility', label: 'Bail mobilité' },
        ],
        orientations: [
            { value: 'north', label: 'Nord' },
            { value: 'south', label: 'Sud' },
            { value: 'west', label: 'Ouest' },
        ],
        amenities: [
            { value: 'elevator', label: 'Ascenseur' },
            { value: 'balcony', label: 'Balcon' },
        ],
        furnishingOptions: [
            { value: 'furnished', label: 'Meublé' },
            { value: 'unfurnished', label: 'Vide' },
        ],
    };
}

/** Lead propriétaire tel que reçu par la Converting Machine propriétaire en modification. */
export function makeOwnerLeadEditable(
    overrides: Partial<OwnerLeadEditable> = {},
): OwnerLeadEditable {
    return {
        id: 9,
        uuid: '0199a9a0-0000-7000-8000-0000000000e9',
        name: 'Paul Roux',
        first_name: 'Paul',
        last_name: 'Roux',
        email: 'paul@example.com',
        phone: '',
        company: '',
        language: 'fr',
        source: 'website',
        source_note: '',
        assigned_to: 2,
        property: makeLeadProperty(),
        ...overrides,
    };
}
/** Avis de l'assistant sur un lead, qualifié par défaut. */
export function makeVerdict(
    overrides: Partial<LeadVerdictInfo> = {},
): LeadVerdictInfo {
    return {
        value: 'qualified',
        label: 'Qualifié',
        reason: 'Projet précis, budget réaliste et arrivée proche.',
        at: '2026-10-28T09:00:00+01:00',
        ...overrides,
    };
}

export function makeLeadPerson(
    overrides: Partial<LeadPerson> = {},
): LeadPerson {
    return {
        slot: 'primary',
        first_name: 'Léa',
        last_name: 'Durand',
        name: 'Léa Durand',
        email: 'lea@example.com',
        phone: '+33 6 12 34 56 78',
        employment_status: null,
        employment_status_label: null,
        employer: null,
        income_cents: null,
        ...overrides,
    };
}

export function makeLeadPeople(
    overrides: Partial<LeadPeople> = {},
): LeadPeople {
    return { primary: makeLeadPerson(), co: null, ...overrides };
}
