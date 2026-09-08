import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch, visit, reload } = vi.hoisted(() => ({
    patch: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { patch, visit, reload, on: () => () => undefined },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Admin' } },
            staff: [
                { id: 1, name: 'Admin', role: 'admin', avatar: null },
                { id: 2, name: 'Camille', role: 'member', avatar: null },
            ],
        },
    }),
    useForm: () => ({
        data: { body: '' },
        errors: {},
        processing: false,
        setData: () => undefined,
        reset: () => undefined,
        post: vi.fn(),
    }),
}));

import LeadsIndex from '@/pages/leads/index';
import { leadStatuses, lossReasons, makeLead } from '@/test/fixtures/lead';

const offers = [
    {
        value: 'accompagne' as const,
        label: 'Accompagné',
        description: '',
        summary: '',
        price_cents: 119_000,
    },
    {
        value: 'confie' as const,
        label: 'Confié',
        description: '',
        summary: '',
        price_cents: 219_000,
    },
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
                archived={{ loaded: true, count: 0 }}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
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

    it('loads the archived leads on demand, from the column or from the table status filter', async () => {
        const user = userEvent.setup();
        localStorage.setItem('leads.kanban.archived-open', '1');
        render(
            <LeadsIndex
                leads={leads.filter((lead) => lead.status !== 'archived')}
                archived={{ loaded: false, count: 12 }}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        expect(
            screen.getByText(
                new RegExp(`^${leads.length - 1 + 12} lead\\(s\\)`),
            ),
        ).toBeInTheDocument();
        const archived = screen.getByRole('listitem', { name: 'Archivé' });
        expect(archived).toHaveTextContent('12');
        await user.click(
            within(archived).getByRole('button', {
                name: 'Afficher les 12 lead(s) archivé(s)',
            }),
        );
        expect(reload).toHaveBeenCalledWith({
            data: { archived: 1 },
            only: ['leads', 'archived'],
        });
        localStorage.clear();
    });

    it('expands the archive column and remembers it', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                leads={leads}
                archived={{ loaded: true, count: 0 }}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
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
                archived={{ loaded: true, count: 0 }}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        await user.type(screen.getByLabelText('Filtrer les leads'), 'marc');
        expect(screen.getByText('Marc Petit')).toBeInTheDocument();
        expect(screen.queryByText('Léa Durand')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
        await user.click(screen.getByRole('button', { name: /Filtres/ }));
        await user.click(await screen.findByRole('combobox', { name: 'Note' }));
        await user.click(
            await screen.findByRole('option', { name: /4 étoiles et plus/ }),
        );

        expect(screen.getByText('Léa Durand')).toBeInTheDocument();
        expect(screen.queryByText('Marc Petit')).not.toBeInTheDocument();
    });

    it('opens the lead page when a card is clicked', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                leads={leads}
                archived={{ loaded: true, count: 0 }}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Léa Durand' }));

        expect(visit).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001',
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('filters on my leads', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                archived={{ loaded: true, count: 0 }}
                leads={[
                    makeLead({
                        assignee: { id: 1, name: 'Admin', avatar: null },
                    }),
                    makeLead({
                        id: 2,
                        name: 'Marc Petit',
                        assignee: { id: 2, name: 'Camille', avatar: null },
                    }),
                    makeLead({ id: 3, name: 'Nina Roy' }),
                ]}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Mes leads (1)' }));
        expect(
            screen.getByRole('button', { name: 'Camille (1)' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Non attribués (1)' }),
        ).toBeInTheDocument();

        expect(screen.getByText('Léa Durand')).toBeInTheDocument();
        expect(screen.queryByText('Marc Petit')).not.toBeInTheDocument();
        expect(screen.queryByText('Nina Roy')).not.toBeInTheDocument();
    });

    it('shows urgency badges for stale leads and imminent arrivals', () => {
        const soon = new Date();
        soon.setDate(soon.getDate() + 5);
        render(
            <LeadsIndex
                archived={{ loaded: true, count: 0 }}
                leads={[
                    makeLead({
                        created_at: '2026-01-01T10:00:00Z',
                        last_contacted_at: null,
                        arrival_at: soon.toISOString().slice(0, 10),
                    }),
                ]}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        expect(screen.getByText(/Sans contact depuis \d+ j/)).toHaveAttribute(
            'data-urgency',
            'late',
        );
        expect(screen.getByText('Arrive dans 5 j')).toBeInTheDocument();
    });

    it('shows an empty state with a call to the Converting Machine', () => {
        render(
            <LeadsIndex
                leads={[]}
                archived={{ loaded: true, count: 0 }}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        expect(
            screen.getByText('Aucun lead pour le moment'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Ouvrir la Converting Machine' }),
        ).toHaveAttribute('href', '/locataires/create');
        expect(
            screen.queryByRole('list', { name: 'Kanban des leads' }),
        ).not.toBeInTheDocument();
    });

    it('sorts the cards of a column by score when asked', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                archived={{ loaded: true, count: 0 }}
                leads={[
                    makeLead({ id: 1, name: 'Bas', position: 0, score: 1 }),
                    makeLead({ id: 2, name: 'Haut', position: 1, score: 5 }),
                ]}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        const names = () =>
            within(screen.getByRole('listitem', { name: 'À traiter' }))
                .getAllByRole('button', { name: /^(Bas|Haut)$/ })
                .map((card) => card.getAttribute('aria-label'));

        expect(names()).toEqual(['Bas', 'Haut']);

        await user.click(screen.getByRole('button', { name: /Filtres/ }));
        await user.click(
            await screen.findByRole('combobox', { name: 'Trier' }),
        );
        await user.click(
            await screen.findByRole('option', { name: 'Meilleure note' }),
        );

        expect(names()).toEqual(['Haut', 'Bas']);
    });
});

describe('First contact countdown on the kanban', () => {
    it('shows the 30-minute timer on a fresh lead and hides it once contacted', () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();

        render(
            <LeadsIndex
                archived={{ loaded: true, count: 0 }}
                leads={[
                    makeLead({
                        id: 1,
                        name: 'Léa Durand',
                        created_at: fiveMinutesAgo,
                        last_contacted_at: null,
                    }),
                    makeLead({
                        id: 2,
                        name: 'Marc Petit',
                        created_at: fiveMinutesAgo,
                        last_contacted_at: new Date().toISOString(),
                    }),
                ]}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        const timers = screen.getAllByRole('timer');
        expect(timers).toHaveLength(1);
        expect(timers[0]).toHaveTextContent(/^À contacter · 2[45]:\d{2}$/);
        expect(timers[0]).toHaveAttribute('data-late', 'false');
    });

    it('switches to a table view like the clients list, and remembers it', async () => {
        const user = userEvent.setup();
        localStorage.removeItem('leads.view');
        const { unmount } = render(
            <LeadsIndex
                archived={{ loaded: true, count: 0 }}
                leads={[
                    makeLead({
                        id: 1,
                        name: 'Léa Durand',
                        assignee: { id: 2, name: 'Camille', avatar: null },
                    }),
                ]}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        expect(screen.queryByRole('table')).toBeNull();
        await user.click(
            within(screen.getByLabelText('Affichage')).getByRole('radio', {
                name: 'Tableau',
            }),
        );

        const table = within(screen.getByRole('table'));
        expect(table.getByRole('link', { name: 'Léa Durand' })).toHaveAttribute(
            'href',
            expect.stringMatching(/^\/locataires\//),
        );
        expect(table.getByText('Camille')).toBeInTheDocument();
        expect(localStorage.getItem('leads.view')).toBe('table');
        unmount();

        render(
            <LeadsIndex
                leads={[makeLead()]}
                archived={{ loaded: true, count: 0 }}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );
        expect(screen.getByRole('table')).toBeInTheDocument();
        localStorage.removeItem('leads.view');
    });

    it('filters the table by status, a filter absent from the kanban', async () => {
        const user = userEvent.setup();
        localStorage.removeItem('leads.view');
        render(
            <LeadsIndex
                leads={leads}
                archived={{ loaded: true, count: 0 }}
                statuses={leadStatuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Filtres/ }));
        expect(screen.queryByRole('combobox', { name: 'Statut' })).toBeNull();
        await user.keyboard('{Escape}');

        await user.click(
            within(screen.getByLabelText('Affichage')).getByRole('radio', {
                name: 'Tableau',
            }),
        );
        await user.click(screen.getByRole('button', { name: /Filtres/ }));
        await user.click(
            await screen.findByRole('combobox', { name: 'Statut' }),
        );
        await user.click(
            await screen.findByRole('option', { name: 'Converti' }),
        );

        const table = within(screen.getByRole('table'));
        expect(table.getByText('Marc Petit')).toBeInTheDocument();
        expect(table.queryByText('Léa Durand')).toBeNull();
        expect(
            screen.getByRole('button', { name: /Filtres/ }),
        ).toHaveTextContent('1');

        // Retour au kanban : le filtre par statut est levé.
        await user.keyboard('{Escape}');
        await user.click(
            within(screen.getByLabelText('Affichage')).getByRole('radio', {
                name: 'Kanban',
            }),
        );
        expect(screen.getByText('Léa Durand')).toBeInTheDocument();
        localStorage.removeItem('leads.view');
    });
});
