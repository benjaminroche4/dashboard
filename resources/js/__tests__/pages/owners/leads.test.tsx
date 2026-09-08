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

import OwnerLeads from '@/pages/owners/leads';
import { lossReasons, makeLead } from '@/test/fixtures/lead';

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

/** Miroir de LeadStatus::ownerOptions(). */
const statuses = [
    { value: 'todo' as const, label: 'À traiter' },
    { value: 'in_progress' as const, label: 'En cours' },
    { value: 'quote_sent' as const, label: 'En signature' },
    { value: 'converted' as const, label: 'Converti' },
    { value: 'archived' as const, label: 'Archivé' },
];

const leads = [
    makeLead({ name: 'Paul Roux', company: null }),
    makeLead({
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000e2',
        name: 'Léa Durand',
        company: 'Nestlé',
        status: 'quote_sent',
        status_label: 'En signature',
        assignee: null,
    }),
    makeLead({
        id: 3,
        name: 'Marc Petit',
        status: 'converted',
        status_label: 'Converti',
    }),
];

describe('Owner leads page', () => {
    beforeEach(() => {
        patch.mockReset();
        visit.mockReset();
        localStorage.clear();
    });

    it('shows the same kanban as the leads list, with the owner column labels', () => {
        render(
            <OwnerLeads
                leads={leads}
                archived={{ loaded: true, count: 0 }}
                statuses={statuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Leads propriétaires',
        );
        expect(
            screen.getByText('3 lead(s) · 2 en cours · 1 converti(s)'),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('listitem', {
                name: /À traiter|En cours|En signature|Converti|Archivé/,
            }),
        ).toHaveLength(5);

        const signing = screen.getByRole('listitem', { name: 'En signature' });
        expect(within(signing).getByText('Léa Durand')).toBeInTheDocument();
        // Palette propriétaires : les colonnes ne reprennent pas les teintes des leads locataires.
        expect(screen.getByRole('listitem', { name: 'À traiter' })).toHaveClass(
            'border-rose-200',
        );
        expect(signing).toHaveClass('border-indigo-200');
        expect(
            screen.getByRole('listitem', { name: 'Archivé' }),
        ).toHaveAttribute('data-collapsed');
        expect(screen.getByLabelText('Affichage')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Prospecter un propriétaire/ }),
        ).toHaveAttribute('href', '/owners');
    });

    it('filters the cards by text and opens the lead page on click', async () => {
        const user = userEvent.setup();
        render(
            <OwnerLeads
                leads={leads}
                archived={{ loaded: true, count: 0 }}
                statuses={statuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        await user.type(screen.getByLabelText('Filtrer les leads'), 'nest');
        expect(screen.getByText('Léa Durand')).toBeInTheDocument();
        expect(screen.queryByText('Paul Roux')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Léa Durand' }));
        expect(visit).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-0000000000e2',
        );
    });

    it('switches to the table view and remembers it separately from the tenant leads', async () => {
        const user = userEvent.setup();
        render(
            <OwnerLeads
                leads={leads}
                archived={{ loaded: true, count: 0 }}
                statuses={statuses}
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
        expect(table.getByRole('link', { name: 'Paul Roux' })).toHaveAttribute(
            'href',
            expect.stringMatching(/^\/locataires\//),
        );
        expect(table.getByText('En signature')).toBeInTheDocument();
        expect(localStorage.getItem('owners.leads.view')).toBe('table');
        expect(localStorage.getItem('leads.view')).toBeNull();
    });

    it('shows an empty state pointing to the owners to prospect', () => {
        render(
            <OwnerLeads
                leads={[]}
                archived={{ loaded: true, count: 0 }}
                statuses={statuses}
                offers={offers}
                lossReasons={lossReasons}
            />,
        );

        expect(
            screen.getByText('Aucun lead propriétaire pour le moment'),
        ).toBeInTheDocument();
        const links = screen.getAllByRole('link', {
            name: 'Prospecter un propriétaire',
        });
        expect(links).toHaveLength(2);
        links.forEach((link) =>
            expect(link).toHaveAttribute('href', '/owners'),
        );
    });
});
