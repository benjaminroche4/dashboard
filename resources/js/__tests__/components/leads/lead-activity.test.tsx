import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch, destroy } = vi.hoisted(() => ({
    patch: vi.fn(),
    destroy: vi.fn(),
}));
vi.mock('@inertiajs/react', () => ({ router: { patch, delete: destroy } }));

import {
    LeadActivity,
    buildActivity,
    highlightMentions,
} from '@/components/leads/lead-activity';
import type { LeadNote, LeadStatusChange } from '@/types';

const note = (overrides: Partial<LeadNote>): LeadNote => ({
    id: 1,
    uuid: '0199a9a0-0000-7000-8000-0000000000c1',
    body: 'Rappeler mardi.',
    by: 'Admin 2',
    avatar: null,
    mine: false,
    can_edit: false,
    can_delete: false,
    at: '2026-09-04T10:00:00+00:00',
    ...overrides,
});
const change: LeadStatusChange = {
    id: 1,
    from: 'À traiter',
    to: 'En cours',
    to_status: 'in_progress',
    by: 'Admin',
    at: '2026-09-04T12:00:00+00:00',
};
const mine = note({
    id: 2,
    uuid: '0199a9a0-0000-7000-8000-0000000000c2',
    body: 'Je rappelle.',
    by: 'Admin',
    mine: true,
    can_edit: true,
    can_delete: true,
    at: '2026-09-04T13:00:00+00:00',
});

describe('buildActivity', () => {
    it('merges notes, sends and statuses in chronological order and filters them', () => {
        const notes = [
            note({
                id: 2,
                body: 'Envoi au lead (x@y.z) : récapitulatif.',
                at: '2026-09-05T10:00:00+00:00',
            }),
            note({ id: 1 }),
        ];

        expect(buildActivity(notes, [change]).map((item) => item.kind)).toEqual(
            ['note', 'status', 'note'],
        );
        expect(buildActivity(notes, [change], 'notes')).toHaveLength(1);
        expect(buildActivity(notes, [change], 'sends')).toHaveLength(1);
        expect(buildActivity(notes, [change], 'statuses')).toHaveLength(1);
    });
});

describe('highlightMentions', () => {
    it('splits known @mentions out of the text', () => {
        expect(
            highlightMentions('Vu avec @Admin 2 et @Inconnu.', [
                'Admin',
                'Admin 2',
            ]),
        ).toEqual(['Vu avec ', { mention: '@Admin 2' }, ' et @Inconnu.']);
    });
});

describe('LeadActivity', () => {
    it('renders bubbles, a status marker and highlighted mentions', () => {
        render(
            <LeadActivity
                leadUuid="0199a9a0-0000-7000-8000-000000000001"
                notes={[note({ id: 1, body: 'Vu avec @Admin.' }), mine]}
                history={[change]}
                staffNames={['Admin', 'Admin 2']}
                filter="all"
            />,
        );

        const items = screen.getAllByRole('listitem');
        expect(items.map((item) => item.getAttribute('data-kind'))).toEqual([
            'note',
            'status',
            'note',
        ]);
        expect(items[1]).toHaveTextContent('En cours (depuis À traiter)');
        expect(screen.getByText('@Admin')).toHaveAttribute('data-mention');
        expect(items[2]).toHaveAttribute('data-mine', 'true');
        expect(
            screen.getByRole('button', {
                name: 'Aller à la dernière activité',
            }),
        ).toBeInTheDocument();
    });

    it('deletes my note after confirmation', async () => {
        const user = userEvent.setup();
        render(
            <LeadActivity
                leadUuid="0199a9a0-0000-7000-8000-000000000001"
                notes={[mine]}
                history={[]}
                filter="all"
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Supprimer la note' }),
        );
        await user.click(
            within(await screen.findByRole('dialog')).getByRole('button', {
                name: 'Supprimer la note',
            }),
        );

        expect(destroy).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/notes/0199a9a0-0000-7000-8000-0000000000c2',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('edits my note inline and saves with ⌘+Entrée', async () => {
        const user = userEvent.setup();
        render(
            <LeadActivity
                leadUuid="0199a9a0-0000-7000-8000-000000000001"
                notes={[mine]}
                history={[]}
                filter="all"
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier la note' }),
        );
        const box = screen.getByRole('textbox', { name: 'Modifier la note' });
        await user.clear(box);
        await user.type(box, 'Je rappelle jeudi.');
        await user.keyboard('{Meta>}{Enter}{/Meta}');

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/notes/0199a9a0-0000-7000-8000-0000000000c2',
            { body: 'Je rappelle jeudi.' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('hides the actions on notes I cannot touch and shows an empty state per filter', () => {
        const { rerender } = render(
            <LeadActivity
                leadUuid="0199a9a0-0000-7000-8000-000000000001"
                notes={[note({})]}
                history={[]}
                filter="all"
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Modifier la note' }),
        ).not.toBeInTheDocument();

        rerender(
            <LeadActivity
                leadUuid="0199a9a0-0000-7000-8000-000000000001"
                notes={[]}
                history={[]}
                filter="sends"
            />,
        );
        expect(
            screen.getByText('Rien dans cette catégorie.'),
        ).toBeInTheDocument();
    });
});
