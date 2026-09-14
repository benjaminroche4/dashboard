import type {
    ClientAgentSuggestion,
    SuggestedAgent,
    Client,
    ClientDetail,
    ClientPriorityOption,
    DossierReadiness,
} from '@/types';

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
        offer: 'confie',
        offer_label: 'Confié',
        priority: 'normal',
        priority_label: 'Normale',
        priority_rank: 1,
        arrival_at: '2026-11-01',
        converted_at: '2026-09-01T10:00:00+02:00',
        closed_at: null,
        closing_reason: null,
        closing_reason_label: null,
        closing_note: null,
        assignee: { id: 1, name: 'Admin', avatar: null },
        agent: null,
        co_tenant: null,
        co_assignee: null,
        income_cents: null,
        household_income_cents: null,
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

/** État du dossier de location : « Prêt » par défaut, à surcharger au besoin. */
export function makeDossierReadiness(
    overrides: Partial<DossierReadiness> = {},
): DossierReadiness {
    return {
        status: 'ready',
        status_label: 'Prêt',
        total: 6,
        accepted: 6,
        to_check: 0,
        refused: 0,
        missing: 0,
        percent: 100,
        ...overrides,
    };
}

/** Motifs de clôture d'un dossier, comme `ClientClosingReason::options()`. */
export const clientClosingReasons = [
    { value: 'installed', label: 'Client installé' },
    { value: 'withdrawn', label: 'Client parti ou sans suite' },
    { value: 'no_home', label: 'Aucun logement trouvé' },
    { value: 'other', label: 'Autre' },
] as const;

/** Agence suggérée pour un dossier, avec son meilleur agent (miroir de SuggestClientAgents::summary()). */
export function makeClientAgentSuggestion(
    overrides: Partial<ClientAgentSuggestion> = {},
): ClientAgentSuggestion {
    const agent: SuggestedAgent = {
        id: 7,
        uuid: '0199a9a0-0000-7000-8000-0000000000b7',
        name: 'Zoé Martin',
        position: 'Négociatrice',
        phone: '+33 6 12 34 56 78',
        email: 'zoe@oberkampf.example',
        relationship_quality: 'excellent',
        relationship_quality_label: 'Excellente',
        is_primary: true,
        score: 14,
        reasons: ['2 biens dans les quartiers visés', 'Excellente relation'],
    };

    return {
        key: 'agency:3',
        agency: {
            id: 3,
            uuid: '0199a9a0-0000-7000-8000-0000000000a3',
            name: 'Oberkampf Immo',
            city: 'Paris',
            postal_code: '75011',
            phone: '+33 1 40 00 00 00',
            email: 'contact@oberkampf.example',
            website: null,
            has_profile: true,
        },
        agents: [agent],
        best_agent: agent,
        score: 14,
        reasons: ['2 biens dans les quartiers visés', 'Excellente relation'],
        available_properties: 2,
        ...overrides,
    };
}
