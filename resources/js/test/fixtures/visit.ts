import type { Visit, VisitStatusOption } from '@/types';

/** Miroir de VisitStatus::options(). */
export const visitStatuses: VisitStatusOption[] = [
    { value: 'planned', label: 'Planifiée' },
    { value: 'done', label: 'Effectuée' },
    { value: 'cancelled', label: 'Annulée' },
];

/** Miroir de VisitFactory : visite planifiée de Léa Durand sur le T2 du 11e. */
export function makeVisit(overrides: Partial<Visit> = {}): Visit {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000a1',
        scheduled_at: '2026-09-15T10:30:00+02:00',
        status: 'planned',
        status_label: 'Planifiée',
        notes: null,
        report: null,
        report_submitted_at: null,
        report_author: null,
        report_due: false,
        client: {
            id: 1,
            uuid: '0199a9a0-0000-7000-8000-000000000001',
            name: 'Léa Durand',
            reference: 'LD-4821',
        },
        property: {
            id: 1,
            uuid: '0199a9a0-0000-7000-8000-0000000000f1',
            label: 'T2 lumineux · 11e',
            street: '12 rue Oberkampf',
            postal_code: '75011',
            city: 'Paris',
            district: 11,
            latitude: 48.8656,
            longitude: 2.3705,
            rent_cents: 150_000,
            currency: 'EUR',
        },
        agent: {
            id: 7,
            uuid: 'agent-uuid',
            name: 'Zoé Martin',
            agency: 'Agence du Marais',
        },
        assignee: { id: 1, name: 'Admin', avatar: null },
        creator: 'Admin',
        creator_avatar: null,
        ...overrides,
    };
}
