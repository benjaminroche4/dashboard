import type {
    Lead,
    LeadDetail,
    LeadInboundMessage,
    LeadProperty,
    LeadPropertyDetail,
    LeadQualification,
    LeadStatusOption,
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
        source_label: 'Recommandation',
        source_note: null,
        districts: [3, 4],
        property_types: [{ value: 't2', label: 'T2' }],
        duration_label: 'Long terme · 12 mois et plus',
        guarantor_label: null,
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
        ai_pending: false,
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

export function makeInbound(
    overrides: Partial<LeadInboundMessage> = {},
): LeadInboundMessage {
    return {
        kind: 'website',
        body: "Bonjour, j'arrive à Paris en octobre avec ma famille.",
        meta: 'Formulaire de contact · Recherche de logement · CT-4F2A11',
        at: '2026-09-06T17:03:00+02:00',
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

export function makeQualification(
    overrides: Partial<LeadQualification> = {},
): LeadQualification {
    return {
        at: '2026-09-08T10:00:00+00:00',
        summary:
            'Cadre muté de Genève, cherche un T3 meublé dans le Marais pour octobre.',
        score: 4,
        score_reason: 'Projet précis et budget réaliste.',
        fields: [
            { key: 'company', label: 'Société', value: 'Nestlé' },
            { key: 'districts', label: 'Arrondissements', value: '3e, 4e' },
            {
                key: 'score',
                label: 'Note',
                value: '4 / 5 · Projet précis et budget réaliste.',
            },
        ],
        ...overrides,
    };
}
