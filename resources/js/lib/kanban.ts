import type {
    Lead,
    LeadAssigneeFilter,
    LeadSortKey,
    LeadStatus,
    LeadStatusOption,
    OfferValue,
} from '@/types';
import { parisFormat } from '@/lib/datetime';

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
    /** Statut, utile en vue tableau (le kanban a déjà une colonne par statut). */
    status: LeadStatus | 'all';
    offer: OfferValue | 'all';
    minScore: number;
    sort: LeadSortKey;
    assignee: LeadAssigneeFilter;
};

export const defaultFilters: LeadFilters = {
    query: '',
    status: 'all',
    offer: 'all',
    minScore: 0,
    sort: 'manual',
    assignee: 'all',
};

/** « AAAA-MM » d'une date d'arrivée, null sans date. */
export function arrivalMonthOf(lead: Pick<Lead, 'arrival_at'>): string | null {
    return lead.arrival_at ? lead.arrival_at.slice(0, 7) : null;
}

export type LeadMonthGroup = {
    /** « AAAA-MM », ou « none » pour les leads sans date d'emménagement. */
    key: string;
    label: string;
    leads: Lead[];
};

/**
 * Les leads groupés par mois d'emménagement, d'après la date d'arrivée
 * estimée (jamais la date de création), du plus proche au plus lointain,
 * chaque mois trié par date d'arrivée ; les leads sans date ferment la
 * liste dans un seul tableau « Date d'arrivée à définir ».
 */
export function groupLeadsByArrivalMonth(leads: Lead[]): LeadMonthGroup[] {
    const months = new Map<string, Lead[]>();
    const undated: Lead[] = [];

    for (const lead of leads) {
        const month = arrivalMonthOf(lead);

        if (month === null) {
            undated.push(lead);
        } else {
            months.set(month, [...(months.get(month) ?? []), lead]);
        }
    }

    const groups = [...months.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, group]) => ({
            key,
            label: arrivalMonthLabel(key),
            leads: [...group].sort((a, b) =>
                (a.arrival_at ?? '').localeCompare(b.arrival_at ?? ''),
            ),
        }));

    if (undated.length > 0) {
        groups.push({
            key: 'none',
            label: "Date d'arrivée à définir",
            leads: undated,
        });
    }

    return groups;
}

const monthFormat = parisFormat({ month: 'long', year: 'numeric' });

/** « Novembre 2026 » pour « 2026-11 ». */
export function arrivalMonthLabel(month: string): string {
    const label = monthFormat.format(new Date(`${month}-15T12:00:00Z`));

    return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Vrai dès qu'un filtre restreint la liste (le tri n'en est pas un) : la
 * liste est alors partielle et une position calculée dessus serait fausse.
 */
export function hasActiveFilters(filters: LeadFilters): boolean {
    return (
        filters.query.trim() !== '' ||
        filters.status !== 'all' ||
        filters.offer !== 'all' ||
        filters.minScore > 0 ||
        filters.assignee !== defaultFilters.assignee
    );
}

/** Filtre puis trie (le tri manuel garde l'ordre des positions). */
export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
    const needle = filters.query.trim().toLowerCase();

    const kept = leads.filter((lead) => {
        if (
            typeof filters.assignee === 'number' &&
            lead.assignee?.id !== filters.assignee
        ) {
            return false;
        }

        if (filters.assignee === 'none' && lead.assignee !== null) {
            return false;
        }

        if (
            needle !== '' &&
            ![
                lead.name,
                lead.email,
                lead.phone,
                lead.origin_city,
                lead.reference,
                lead.company,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(needle)
        ) {
            return false;
        }

        if (filters.status !== 'all' && lead.status !== filters.status) {
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
        // Du plus ancien au plus récent : les leads qui attendent depuis le
        // plus longtemps remontent (demandé le 28 octobre 2026).
        oldest: (a, b) =>
            (a.created_at ?? '').localeCompare(b.created_at ?? ''),
    };

    return [...kept].sort(comparators[filters.sort]);
}
