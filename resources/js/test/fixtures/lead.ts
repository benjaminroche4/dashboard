import type {
    Lead,
    LeadDetail,
    LeadInboundMessage,
    LeadStatusOption,
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
        loss_reason: null,
        loss_reason_label: null,
        loss_note: null,
        position: 0,
        last_contacted_at: null,
        visio_at: null,
        visio_meet_link: null,
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
    { value: 'too_expensive' as const, label: 'Trop cher' },
    { value: 'went_elsewhere' as const, label: 'Parti ailleurs' },
    { value: 'no_answer' as const, label: 'Sans réponse' },
    { value: 'out_of_scope' as const, label: 'Hors périmètre' },
    { value: 'other' as const, label: 'Autre' },
];
