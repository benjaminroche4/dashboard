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
    router: { patch, visit, on: () => () => undefined },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Admin' } },
            staff: [
                { id: 1, name: 'Admin', role: 'admin' },
                { id: 2, name: 'Camille', role: 'member' },
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
        await user.click(screen.getByRole('button', { name: 'Note' }));
        await user.click(
            await screen.findByRole('menuitem', { name: /4 étoiles et plus/ }),
        );

        expect(screen.getByText('Léa Durand')).toBeInTheDocument();
        expect(screen.queryByText('Marc Petit')).not.toBeInTheDocument();
    });

    it('opens the preview sheet when a card is clicked', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({ lead: leads[0], notes: [], history: [] }),
            })),
        );
        const user = userEvent.setup();
        render(
            <LeadsIndex
                leads={leads}
                statuses={leadStatuses}
                offers={offers}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Léa Durand' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            '/leads/1/preview',
            expect.anything(),
        );
        vi.unstubAllGlobals();
    });

    it('filters on my leads', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                leads={[
                    makeLead({ assignee: { id: 1, name: 'Admin' } }),
                    makeLead({
                        id: 2,
                        name: 'Marc Petit',
                        assignee: { id: 2, name: 'Camille' },
                    }),
                    makeLead({ id: 3, name: 'Nina Roy' }),
                ]}
                statuses={leadStatuses}
                offers={offers}
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
                leads={[
                    makeLead({
                        created_at: '2026-01-01T10:00:00Z',
                        last_contacted_at: null,
                        arrival_at: soon.toISOString().slice(0, 10),
                    }),
                ]}
                statuses={leadStatuses}
                offers={offers}
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

    it('sorts the cards of a column by score when asked', async () => {
        const user = userEvent.setup();
        render(
            <LeadsIndex
                leads={[
                    makeLead({ id: 1, name: 'Bas', position: 0, score: 1 }),
                    makeLead({ id: 2, name: 'Haut', position: 1, score: 5 }),
                ]}
                statuses={leadStatuses}
                offers={offers}
            />,
        );

        const names = () =>
            within(screen.getByRole('listitem', { name: 'À traiter' }))
                .getAllByRole('button', { name: /^(Bas|Haut)$/ })
                .map((card) => card.getAttribute('aria-label'));

        expect(names()).toEqual(['Bas', 'Haut']);

        await user.click(screen.getByRole('button', { name: 'Trier' }));
        await user.click(
            await screen.findByRole('menuitem', { name: 'Meilleure note' }),
        );

        expect(names()).toEqual(['Haut', 'Bas']);
    });
});
