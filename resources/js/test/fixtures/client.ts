import type { Client, ClientDetail, ClientPriorityOption } from '@/types';

/** Miroir de LeadFactory::converted() : un dossier client suivi par Admin. */
export function makeClient(overrides: Partial<Client> = {}): Client {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000e1',
        reference: 'LD-4821',
        name: 'Léa Durand',
        company: 'Nestlé',
        email: 'lea@example.com',
        phone: '+33 6 00 00 00 00',
        offer_label: 'Confié',
        priority: 'normal',
        priority_label: 'Normale',
        priority_rank: 1,
        arrival_at: '2026-11-01',
        converted_at: '2026-09-01T10:00:00+02:00',
        assignee: { id: 1, name: 'Admin', avatar: null },
        invoices_count: 1,
        document_requests_count: 2,
        ...overrides,
    };
}

export function makeClientDetail(
    overrides: Partial<ClientDetail> = {},
): ClientDetail {
    return {
        ...makeClient(),
        language_label: 'Français',
        origin_city: 'Genève',
        budget_cents: 250_000,
        currency: 'EUR',
        districts: [3, 4, 11],
        property_types: ['Appartement'],
        duration_label: '1 an',
        furnished_label: 'Meublé',
        guarantor_label: 'Employeur',
        message: 'Arrivée avec deux enfants.',
        score: 4,
        ...overrides,
    };
}

/** Miroir de ClientPriority::options(). */
export const clientPriorities: ClientPriorityOption[] = [
    { value: 'low', label: 'Basse' },
    { value: 'normal', label: 'Normale' },
    { value: 'high', label: 'Haute' },
    { value: 'urgent', label: 'Urgente' },
];
