import { describe, expect, it } from 'vitest';
import {
    applyMove,
    columnOf,
    columnStats,
    defaultFilters,
    filterLeads,
} from '@/lib/kanban';
import { leadStatuses, makeLead } from '@/test/fixtures/lead';

const leads = [
    makeLead({ id: 1, name: 'A', position: 0 }),
    makeLead({
        id: 2,
        name: 'B',
        position: 1,
        score: 2,
        offer: 'confie',
        offer_label: 'Confié',
    }),
    makeLead({
        id: 3,
        name: 'C',
        position: 2,
        budget_cents: null,
        score: null,
    }),
    makeLead({
        id: 4,
        name: 'Xavier',
        email: 'x@test.fr',
        status: 'in_progress',
        status_label: 'En cours',
        position: 0,
        currency: 'CHF',
        budget_cents: 100_000,
    }),
];

describe('applyMove', () => {
    it('moves a lead into another column at the given index and renumbers both columns', () => {
        const next = applyMove(leads, 2, leadStatuses[1], 0);

        expect(
            columnOf(next, 'todo').map((lead) => [lead.id, lead.position]),
        ).toEqual([
            [1, 0],
            [3, 1],
        ]);
        expect(
            columnOf(next, 'in_progress').map((lead) => [
                lead.id,
                lead.position,
            ]),
        ).toEqual([
            [2, 0],
            [4, 1],
        ]);
        expect(next.find((lead) => lead.id === 2)?.status_label).toBe(
            'En cours',
        );
    });

    it('reorders inside a column and clamps the index', () => {
        const next = applyMove(leads, 1, leadStatuses[0], 99);

        expect(columnOf(next, 'todo').map((lead) => lead.id)).toEqual([
            2, 3, 1,
        ]);
        expect(applyMove(leads, 42, leadStatuses[0], 0)).toBe(leads);
    });
});

describe('columnStats', () => {
    it('sums budgets per currency and averages the scores', () => {
        const stats = columnStats(leads);

        expect(stats.count).toBe(4);
        expect(stats.budgets).toEqual([
            { currency: 'EUR', cents: 500_000 },
            { currency: 'CHF', cents: 100_000 },
        ]);
        expect(stats.averageScore).toBe(3.3);
        expect(columnStats([]).averageScore).toBeNull();
    });
});

describe('filterLeads', () => {
    it('filters by text, offer and minimum score, then sorts', () => {
        expect(
            filterLeads(leads, { ...defaultFilters, query: 'xav' }).map(
                (lead) => lead.id,
            ),
        ).toEqual([4]);
        // La référence LD-XXXX et la société comptent aussi.
        expect(
            filterLeads(
                [makeLead({ id: 9, reference: 'LD-4242', company: 'Nestlé' })],
                { ...defaultFilters, query: '4242' },
            ).map((lead) => lead.id),
        ).toEqual([9]);
        expect(
            filterLeads(
                [makeLead({ id: 9, reference: 'LD-4242', company: 'Nestlé' })],
                { ...defaultFilters, query: 'nestl' },
            ).map((lead) => lead.id),
        ).toEqual([9]);
        expect(
            filterLeads(leads, { ...defaultFilters, offer: 'confie' }).map(
                (lead) => lead.id,
            ),
        ).toEqual([2]);
        expect(
            filterLeads(leads, { ...defaultFilters, minScore: 4 }).map(
                (lead) => lead.id,
            ),
        ).toEqual([1, 4]);
        expect(
            filterLeads(leads, { ...defaultFilters, sort: 'score' }).map(
                (lead) => lead.id,
            ),
        ).toEqual([1, 4, 2, 3]);
    });
});
