import type {
    Visit,
    VisitClientOption,
    VisitDetail,
    VisitStatusOption,
} from '@/types';

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
        mode: 'for_client',
        mode_label: 'Par l’équipe',
        report: null,
        report_photos: [],
        report_submitted_at: null,
        report_author: null,
        report_due: false,
        can_report: false,
        can_notify_client: true,
        outcome: 'pending',
        outcome_label: 'À décider',
        client: {
            id: 1,
            uuid: '0199a9a0-0000-7000-8000-000000000001',
            name: 'Léa Durand',
            reference: 'LD-4821',
            offer: 'accompagne',
            offer_label: 'Accompagné',
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
            photo: null,
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

/** Client sélectionnable pour une visite ; formule « Accompagné » par défaut. */
export function makeVisitClient(
    overrides: Partial<VisitClientOption> = {},
): VisitClientOption {
    return {
        id: 1,
        uuid: 'client-1',
        name: 'Léa Durand',
        reference: 'LD-4821',
        offer: 'accompagne',
        offer_label: 'Accompagné',
        ...overrides,
    };
}

/** Les deux façons de visiter (`VisitMode::options()`). */

/** Visite détaillée, pour la page « Fiche d'une visite ». */
export function makeVisitDetail(
    overrides: Partial<VisitDetail> = {},
): VisitDetail {
    const visit = makeVisit();

    return {
        ...visit,
        created_at: '2026-09-10T09:00:00+02:00',
        ...overrides,
        property: {
            ...visit.property,
            property_type_label: 'T2',
            furnished_label: 'Meublé',
            rooms: 2,
            surface_m2: 42,
            floor_label: '3e étage',
            charges_cents: 10_000,
            listing_url: null,
            photos: [],
            owner: null,
            ...overrides.property,
        },
    };
}
