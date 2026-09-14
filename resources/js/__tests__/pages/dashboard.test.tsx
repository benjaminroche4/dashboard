import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: vi.fn() },
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
    usePage: () => ({
        props: { auth: { user: { id: 1, name: 'Admin' } }, features: {} },
    }),
}));

import Dashboard from '@/pages/dashboard';
import { makeLead } from '@/test/fixtures/lead';
import { makeVisit } from '@/test/fixtures/visit';
import type { Today } from '@/types';

const empty: Today = {
    visits: [],
    reports_due: { items: [], total: 0 },
    first_contacts: { items: [], total: 0 },
    recontacts: { items: [], total: 0 },
    decisions: { items: [], total: 0 },
    documents_to_review: { items: [], total: 0 },
};

describe('Aujourd’hui', () => {
    it('says plainly when nothing waits', () => {
        render(<Dashboard today={empty} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Aujourd’hui',
        );
        expect(screen.getByRole('status')).toHaveTextContent(
            'Rien ne vous attend pour l’instant.',
        );
    });

    it('lists my round with a tap to the itinerary, and what else waits for me', () => {
        const visit = makeVisit({
            uuid: 'v-1',
            scheduled_at: '2026-09-14T10:00:00+02:00',
            report_due: false,
        });
        render(
            <Dashboard
                today={{
                    ...empty,
                    visits: [visit],
                    reports_due: {
                        items: [makeVisit({ uuid: 'v-2', report_due: true })],
                        total: 3,
                    },
                    first_contacts: {
                        items: [
                            makeLead({
                                status: 'todo',
                                last_contacted_at: null,
                            }),
                        ],
                        total: 1,
                    },
                    decisions: {
                        items: [
                            {
                                lead: { uuid: 'c-1', name: 'Léa Durand' },
                                property: { uuid: 'p-1', label: 'T2 · 11e' },
                                due: true,
                            },
                        ],
                        total: 1,
                    },
                    documents_to_review: {
                        items: [{ uuid: 'd-1', name: 'Léa Durand', count: 2 }],
                        total: 2,
                    },
                }}
            />,
        );

        const round = within(
            screen.getByRole('region', { name: 'Ma tournée' }),
        );
        expect(round.getByRole('link', { name: '10:00' })).toHaveAttribute(
            'href',
            '/clients/visits/v-1',
        );
        // L'adresse ouvre l'itinéraire dans l'application de cartes.
        expect(round.getByRole('link', { name: /rue/i })).toHaveAttribute(
            'href',
            expect.stringContaining(
                'https://www.google.com/maps/dir/?api=1&destination=',
            ),
        );

        // Le total réel se lit même quand la liste est tronquée.
        expect(
            screen.getByRole('region', { name: 'Comptes rendus à rédiger' }),
        ).toHaveTextContent('3');
        expect(
            screen.getByRole('region', { name: 'Décisions attendues' }),
        ).toHaveTextContent('À relancer');
        expect(
            screen.getByRole('region', {
                name: 'Pièces relues par l’assistant',
            }),
        ).toHaveTextContent('2 à relire');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('hides a block whose section is closed to the member', () => {
        render(
            <Dashboard today={{ ...empty, visits: null, reports_due: null }} />,
        );

        expect(
            screen.queryByRole('region', { name: 'Ma tournée' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Recontacts du jour' }),
        ).toBeInTheDocument();
    });
});
