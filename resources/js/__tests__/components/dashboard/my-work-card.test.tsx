import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
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
    usePage: () => ({ props: { auth: { user: { id: 1, name: 'Admin' } } } }),
}));

import { MyWorkCard } from '@/components/dashboard/my-work-card';
import { makeLead } from '@/test/fixtures/lead';

const now = new Date('2026-09-15T09:00:00+02:00');

describe('MyWorkCard', () => {
    it('lists my leads, owner leads and client files with links, counts and what presses', () => {
        render(
            <MyWorkCard
                now={now}
                mine={{
                    leads: {
                        total: 8,
                        items: [
                            makeLead({
                                id: 1,
                                name: 'Ana Silva',
                                recontact_at: '2026-09-10',
                                last_contacted_at: '2026-09-14T10:00:00+02:00',
                            }),
                            makeLead({
                                id: 2,
                                uuid: 'lead-2',
                                name: 'Léa Durand',
                                company: 'Nestlé',
                                recontact_at: null,
                                last_contacted_at: '2026-09-05T10:00:00+02:00',
                                arrival_at: null,
                            }),
                        ],
                    },
                    owner_leads: { total: 0, items: [] },
                    clients: {
                        total: 1,
                        items: [
                            makeLead({
                                id: 3,
                                uuid: 'client-3',
                                name: 'Zoé Martin',
                                status: 'converted',
                                status_label: 'Converti',
                                recontact_at: null,
                                last_contacted_at: '2026-09-14T10:00:00+02:00',
                                arrival_at: '2026-09-20',
                            }),
                        ],
                    },
                }}
            />,
        );

        const card = within(
            screen.getByRole('region', { name: 'Mon travail' }),
        );
        expect(
            card.getByText('9 dossiers attribués à Admin'),
        ).toBeInTheDocument();

        const leads = within(card.getByRole('region', { name: 'Mes leads' }));
        expect(leads.getByLabelText('8 au total')).toHaveTextContent('8');
        expect(leads.getByRole('link', { name: /Ana Silva/ })).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-000000000001',
        );
        expect(leads.getByText(/Recontact en retard/)).toBeInTheDocument();
        expect(
            leads.getByText(/Sans contact depuis \d+ j/),
        ).toBeInTheDocument();
        expect(leads.getByText(/et 6 autres/)).toBeInTheDocument();
        expect(
            leads.getByRole('link', { name: 'Tous les leads' }),
        ).toHaveAttribute('href', '/locataires');

        expect(
            within(
                card.getByRole('region', { name: 'Mes leads propriétaires' }),
            ).getByText('Aucun lead propriétaire ne vous est attribué.'),
        ).toBeInTheDocument();

        const clients = within(
            card.getByRole('region', { name: 'Mes dossiers clients' }),
        );
        expect(
            clients.getByRole('link', { name: /Zoé Martin/ }),
        ).toHaveAttribute('href', '/clients/client-3');
        expect(clients.getByText('Arrive dans 5 j')).toBeInTheDocument();
        expect(clients.getByText('Converti')).toBeInTheDocument();
    });

    it('hides the blocks whose section is closed to the member', () => {
        render(
            <MyWorkCard
                now={now}
                mine={{
                    leads: null,
                    owner_leads: { total: 0, items: [] },
                    clients: null,
                }}
            />,
        );

        expect(
            screen.queryByRole('region', { name: 'Mes leads' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Mes dossiers clients' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Mes leads propriétaires' }),
        ).toBeInTheDocument();

        render(
            <MyWorkCard
                now={now}
                mine={{ leads: null, owner_leads: null, clients: null }}
            />,
        );
        expect(
            screen.getByText('Aucune section ne vous est ouverte.'),
        ).toBeInTheDocument();
    });
});
