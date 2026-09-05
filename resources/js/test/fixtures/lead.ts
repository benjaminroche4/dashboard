import type { Lead, LeadDetail, LeadStatusOption } from '@/types';

/** Miroir de LeadFactory : lead nouveau, offre Accompagné, budget 2 500 EUR. */
export function makeLead(overrides: Partial<Lead> = {}): Lead {
    return {
        id: 1,
        name: 'Léa Durand',
        email: 'lea@example.com',
        phone: '+33 6 00 00 00 00',
        offer: 'accompagne',
        offer_label: 'Accompagné',
        arrival_at: '2026-11-01',
        budget_cents: 250_000,
        currency: 'EUR',
        origin_city: 'Genève',
        source_label: 'Recommandation',
        message: 'Arrive avec sa famille, cherche un 3 pièces.',
        score: 4,
        status: 'todo',
        status_label: 'À traiter',
        position: 0,
        last_contacted_at: null,
        created_at: '2026-09-04T10:00:00+00:00',
        created_by: 'Admin',
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
        ...overrides,
    } as LeadDetail;
}
