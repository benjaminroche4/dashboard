import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
}));

import { AgentLeadRow } from '@/components/real-estate/agent-lead-link';

describe('AgentLeadRow', () => {
    it('gives the lead its context: status, reference, formula, budget, arrival and follow-up', () => {
        render(
            <AgentLeadRow
                lead={{
                    uuid: 'u-1',
                    name: 'Léa Durand',
                    status: 'in_progress',
                    status_label: 'En cours',
                    is_client: false,
                    reference: 'LD-1234',
                    offer: 'accompagne',
                    offer_label: 'Accompagné',
                    budget_cents: 260000,
                    currency: 'EUR',
                    arrival_at: '2027-01-20',
                    assignee: { name: 'Camille', avatar: null },
                }}
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', expect.stringMatching(/^\/locataires\//));
        expect(screen.getByText('En cours')).toBeInTheDocument();
        expect(screen.getByText('LD-1234')).toBeInTheDocument();
        expect(screen.getByText('Accompagné')).toBeInTheDocument();
        expect(screen.getByText(/2 600,00 € \/ mois/)).toBeInTheDocument();
        expect(
            screen.getByText(/Arrivée le 20 janv. 2027/),
        ).toBeInTheDocument();
        expect(screen.getByText(/Suivi par Camille/)).toBeInTheDocument();
    });

    it('writes nothing it does not know, and sends a client to its dossier', () => {
        render(
            <AgentLeadRow
                lead={{
                    uuid: 'u-2',
                    name: 'Bruno & Charles',
                    status_label: 'Converti',
                    is_client: true,
                }}
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Bruno & Charles' }),
        ).toHaveAttribute('href', expect.stringMatching(/^\/clients\//));
        expect(screen.getByText('Client')).toBeInTheDocument();
        expect(screen.queryByText(/Arrivée le/)).toBeNull();
    });
});
