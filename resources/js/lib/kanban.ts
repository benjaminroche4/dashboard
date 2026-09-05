import type {
    Lead,
    LeadAssigneeFilter,
    LeadSortKey,
    LeadStatus,
    LeadStatusOption,
    OfferValue,
} from '@/types';

/**
 * Déplace un lead vers une colonne et une position, puis renumérote chaque
 * colonne. Pur : renvoie un nouveau tableau, l'ordre global suit l'ordre
 * des colonnes puis les positions.
 */
export function applyMove(
    leads: Lead[],
    id: number,
    status: LeadStatusOption,
    index: number,
): Lead[] {
    const moving = leads.find((lead) => lead.id === id);

    if (!moving) {
        return leads;
    }

    const others = leads.filter((lead) => lead.id !== id);
    const column = others.filter((lead) => lead.status === status.value);
    const clamped = Math.max(0, Math.min(index, column.length));
    const moved = {
        ...moving,
        status: status.value,
        status_label: status.label,
    };

    column.splice(clamped, 0, moved);

    const rest = others.filter((lead) => lead.status !== status.value);

    return renumber([...rest, ...column]);
}

/** Positions 0..n par colonne, dans l'ordre d'apparition. */
export function renumber(leads: Lead[]): Lead[] {
    const counters: Partial<Record<LeadStatus, number>> = {};

    return leads.map((lead) => {
        const position = counters[lead.status] ?? 0;
        counters[lead.status] = position + 1;

        return lead.position === position ? lead : { ...lead, position };
    });
}

export function columnOf(leads: Lead[], status: LeadStatus): Lead[] {
    return leads
        .filter((lead) => lead.status === status)
        .sort((a, b) => a.position - b.position);
}

export type ColumnStats = {
    count: number;
    /** Somme des budgets, par devise. */
    budgets: { currency: string; cents: number }[];
    /** Note moyenne sur les leads notés, null si aucun. */
    averageScore: number | null;
};

export function columnStats(leads: Lead[]): ColumnStats {
    const budgets = new Map<string, number>();
    let scored = 0;
    let total = 0;

    for (const lead of leads) {
        if (lead.budget_cents !== null) {
            budgets.set(
                lead.currency,
                (budgets.get(lead.currency) ?? 0) + lead.budget_cents,
            );
        }

        if (lead.score !== null) {
            scored += 1;
            total += lead.score;
        }
    }

    return {
        count: leads.length,
        budgets: [...budgets.entries()].map(([currency, cents]) => ({
            currency,
            cents,
        })),
        averageScore:
            scored === 0 ? null : Math.round((total / scored) * 10) / 10,
    };
}

export type LeadFilters = {
    query: string;
    offer: OfferValue | 'all';
    minScore: number;
    sort: LeadSortKey;
    assignee: LeadAssigneeFilter;
};

export const defaultFilters: LeadFilters = {
    query: '',
    offer: 'all',
    minScore: 0,
    sort: 'manual',
    assignee: 'all',
};

/** Filtre puis trie (le tri manuel garde l'ordre des positions). */
export function filterLeads(
    leads: Lead[],
    filters: LeadFilters,
    currentUserId: number | null = null,
): Lead[] {
    const needle = filters.query.trim().toLowerCase();

    const kept = leads.filter((lead) => {
        if (filters.assignee === 'me' && lead.assignee?.id !== currentUserId) {
            return false;
        }

        if (filters.assignee === 'none' && lead.assignee !== null) {
            return false;
        }

        if (
            needle !== '' &&
            ![lead.name, lead.email, lead.phone, lead.origin_city]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(needle)
        ) {
            return false;
        }

        if (filters.offer !== 'all' && lead.offer !== filters.offer) {
            return false;
        }

        return filters.minScore <= 0 || (lead.score ?? 0) >= filters.minScore;
    });

    const comparators: Record<LeadSortKey, (a: Lead, b: Lead) => number> = {
        manual: (a, b) => a.position - b.position,
        score: (a, b) => (b.score ?? -1) - (a.score ?? -1),
        arrival: (a, b) =>
            (a.arrival_at ?? '9999').localeCompare(b.arrival_at ?? '9999'),
        created: (a, b) =>
            (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    };

    return [...kept].sort(comparators[filters.sort]);
}
