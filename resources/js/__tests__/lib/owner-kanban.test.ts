import { describe, expect, it } from 'vitest';
import {
    filterOwnerLeads,
    moveOwnerLead,
    ownerColumn,
} from '@/lib/owner-kanban';
import { makeOwnerLead } from '@/test/fixtures/owner';

const leads = [
    makeOwnerLead(),
    makeOwnerLead({
        id: 2,
        reference: 'LD-0043',
        name: 'Léa Durand',
        company: 'Nestlé',
        status: 'in_progress',
        status_label: 'En cours',
    }),
];

describe('owner kanban helpers', () => {
    it('moves a lead to another column with the new label, leaving the rest untouched', () => {
        const moved = moveOwnerLead(leads, 1, {
            value: 'quote_sent',
            label: 'En signature',
        });

        expect(moved[0]).toMatchObject({
            id: 1,
            status: 'quote_sent',
            status_label: 'En signature',
        });
        expect(moved[1]).toBe(leads[1]);
        expect(ownerColumn(moved, 'quote_sent').map((lead) => lead.id)).toEqual(
            [1],
        );
        expect(ownerColumn(moved, 'todo')).toEqual([]);
    });

    it('filters by name, company, reference or e-mail', () => {
        expect(filterOwnerLeads(leads, 'nest').map((lead) => lead.id)).toEqual([
            2,
        ]);
        expect(
            filterOwnerLeads(leads, 'LD-0042').map((lead) => lead.id),
        ).toEqual([1]);
        expect(filterOwnerLeads(leads, '  ')).toHaveLength(2);
    });
});
