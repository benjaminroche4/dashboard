import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { patch },
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import OwnerLeads from '@/pages/owners/leads';
import { lossReasons } from '@/test/fixtures/lead';
import { makeOwnerLead } from '@/test/fixtures/owner';

const statuses = [
    { value: 'todo' as const, label: 'À traiter' },
    { value: 'in_progress' as const, label: 'En cours' },
    { value: 'quote_sent' as const, label: 'En signature' },
    { value: 'converted' as const, label: 'Converti' },
    { value: 'archived' as const, label: 'Archivé' },
];

const leads = [
    makeOwnerLead(),
    makeOwnerLead({
        id: 2,
        uuid: 'u2',
        reference: 'LD-0043',
        name: 'Léa Durand',
        company: 'Nestlé',
        status: 'in_progress',
        status_label: 'En cours',
        assignee: null,
        last_contacted_at: '2026-09-05T10:00:00+00:00',
    }),
];

describe('Owner leads kanban page', () => {
    beforeEach(() => patch.mockReset());

    it('shows one column per status with counts and the cards in the right column', () => {
        render(
            <OwnerLeads
                leads={leads}
                statuses={statuses}
                lossReasons={lossReasons}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Leads propriétaires',
        );
        expect(
            screen.getByText('2 demande(s) de gestion locative · 1 à traiter'),
        ).toBeInTheDocument();

        const headings = within(
            screen.getByTestId('owner-kanban'),
        ).getAllByRole('heading', { level: 2 });
        expect(headings.map((heading) => heading.textContent)).toEqual([
            'À traiter',
            'En cours',
            'En signature',
            'Converti',
            'Archivé',
        ]);

        const todo = within(screen.getByRole('region', { name: 'À traiter' }));
        expect(todo.getByLabelText('1 lead(s)')).toBeInTheDocument();
        expect(todo.getByRole('link', { name: 'Paul Roux' })).toHaveAttribute(
            'href',
            '/leads/0199a9a0-0000-7000-8000-0000000000e1',
        );
        expect(todo.getByText('Jamais contacté')).toBeInTheDocument();
        expect(todo.getByTitle('Suivi par Charles')).toBeInTheDocument();

        const inProgress = within(
            screen.getByRole('region', { name: 'En cours' }),
        );
        expect(inProgress.getByText('Nestlé')).toBeInTheDocument();
        expect(inProgress.getByText('Non attribué')).toBeInTheDocument();
        expect(
            within(screen.getByRole('region', { name: 'Archivé' })).getByText(
                'Aucun lead',
            ),
        ).toBeInTheDocument();
    });

    it('filters the cards by name or company and offers to prospect an owner', async () => {
        const user = userEvent.setup();
        render(
            <OwnerLeads
                leads={leads}
                statuses={statuses}
                lossReasons={lossReasons}
            />,
        );

        await user.type(
            screen.getByRole('textbox', { name: 'Filtrer les leads' }),
            'nest',
        );
        expect(
            screen.queryByRole('link', { name: 'Paul Roux' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Prospecter un propriétaire/ }),
        ).toHaveAttribute('href', '/owners');
    });

    it('changes the status from the card badge, with the owner labels', async () => {
        const user = userEvent.setup();
        render(
            <OwnerLeads
                leads={leads}
                statuses={statuses}
                lossReasons={lossReasons}
            />,
        );

        const todo = within(screen.getByRole('region', { name: 'À traiter' }));
        await user.click(
            todo.getByRole('button', {
                name: 'Changer le statut de Paul Roux',
            }),
        );
        await user.click(
            screen.getByRole('menuitem', { name: /En signature/ }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/leads/0199a9a0-0000-7000-8000-0000000000e1/status',
            { status: 'quote_sent' },
            expect.anything(),
        );
    });
});
