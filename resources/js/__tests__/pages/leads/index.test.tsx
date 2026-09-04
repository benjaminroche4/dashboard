import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch, visit } = vi.hoisted(() => ({ patch: vi.fn(), visit: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { patch, visit },
}));

import LeadsIndex from '@/pages/leads/index';
import { leadStatuses, makeLead } from '@/test/fixtures/lead';

const offers = [
    { value: 'accompagne' as const, label: 'Accompagné', description: '' },
    { value: 'confie' as const, label: 'Confié', description: '' },
];
const leads = [
    makeLead(),
    makeLead({
        id: 2,
        name: 'Marc Petit',
        status: 'converted',
        status_label: 'Converti',
        score: 2,
    }),
    makeLead({
        id: 3,
        name: 'Nina Roy',
        status: 'archived',
        status_label: 'Archivé',
        budget_cents: null,
    }),
];

describe('Leads kanban page', () => {
    beforeEach(() => localStorage.clear());

    it('shows one column per status, column totals and a collapsed archive', () => {
        render(
            <LeadsIndex
                leads={leads}
                statuses={leadStatuses}
                offers={offers}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Leads',
        );
        expect(
            screen.getByText('3 lead(s) · 1 en cours · 1 converti(s)'),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('listitem', {
                name: /À traiter|En cours|Devis envoyé|Converti|Archivé/,
            }),
        ).toHaveLength(5);

        const todo = screen.getByRole('listitem', { name: 'À traiter' });
        expect(within(todo).getByText('Léa Durand')).toBeInTheDocument();
        expect(
            todo.querySelector('[data-test="column-stats"]'),
        ).toHaveTextContent(/2.500,00.*4/);
        expect(
            within(
                screen.getByRole('listitem', { name: 'En cours' }),
            ).getByText('Déposez un lead ici'),
        ).toBeInTheDocument();

        const archived = screen.getByRole('listitem', { name: 'Archivé' });
        expect(archived).toHaveAttribute('data-collapsed');
        expect(
            within(archived).queryByText('Nina Roy'),
        ).not.toBeInTheDocument();
    });

    it('expands the archive column and remembers it', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                leads={leads}
                statuses={leadStatuses}
                offers={offers}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Déplier Archivé (1)' }),
        );

        expect(
            within(screen.getByRole('listitem', { name: 'Archivé' })).getByText(
                'Nina Roy',
            ),
        ).toBeInTheDocument();
        expect(localStorage.getItem('leads.kanban.archived-open')).toBe('1');
    });

    it('filters cards by text and by minimum score', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                leads={leads}
                statuses={leadStatuses}
                offers={offers}
            />,
        );

        await user.type(screen.getByLabelText('Filtrer les leads'), 'marc');
        expect(screen.getByText('Marc Petit')).toBeInTheDocument();
        expect(screen.queryByText('Léa Durand')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
        await user.click(
            screen.getByRole('combobox', { name: 'Note minimale' }),
        );
        await user.click(
            await screen.findByRole('option', { name: /4 et plus/ }),
        );

        expect(screen.getByText('Léa Durand')).toBeInTheDocument();
        expect(screen.queryByText('Marc Petit')).not.toBeInTheDocument();
    });

    it('opens the lead detail when a card is clicked', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                leads={leads}
                statuses={leadStatuses}
                offers={offers}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Léa Durand' }));

        expect(visit).toHaveBeenCalledWith('/leads/1');
    });

    it('shows an empty state with a call to the Converting Machine', () => {
        render(
            <LeadsIndex leads={[]} statuses={leadStatuses} offers={offers} />,
        );

        expect(
            screen.getByText('Aucun lead pour le moment'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Ouvrir la Converting Machine' }),
        ).toHaveAttribute('href', '/leads/create');
        expect(
            screen.queryByRole('list', { name: 'Kanban des leads' }),
        ).not.toBeInTheDocument();
    });
});
