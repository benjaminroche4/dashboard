import type { Lead, LeadStatusOption } from '@/types';

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
        status: 'new',
        status_label: 'Nouveau',
        last_contacted_at: null,
        created_at: '2026-09-04T10:00:00+00:00',
        created_by: 'Admin',
        ...overrides,
    } as Lead;
}

export const leadStatuses: LeadStatusOption[] = [
    { value: 'new', label: 'Nouveau' },
    { value: 'contacted', label: 'Contacté' },
    { value: 'in_discussion', label: 'En discussion' },
    { value: 'converted', label: 'Converti' },
    { value: 'lost', label: 'Perdu' },
];
