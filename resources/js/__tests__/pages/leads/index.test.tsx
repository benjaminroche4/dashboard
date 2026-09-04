import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { patch: vi.fn() },
}));

import LeadsIndex from '@/pages/leads/index';
import { leadStatuses, makeLead } from '@/test/fixtures/lead';

describe('Leads page', () => {
    it('shows the summary, the Converting Machine button and one row per lead', () => {
        render(
            <LeadsIndex
                leads={[
                    makeLead(),
                    makeLead({
                        id: 2,
                        name: 'Marc Petit',
                        status: 'converted',
                        status_label: 'Converti',
                    }),
                    makeLead({
                        id: 3,
                        name: 'Nina Roy',
                        status: 'lost',
                        status_label: 'Perdu',
                        budget_cents: null,
                    }),
                ]}
                statuses={leadStatuses}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Leads',
        );
        expect(
            screen.getByText('3 lead(s) · 1 en cours · 1 converti(s)'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Converting Machine' }),
        ).toHaveAttribute('href', '/leads/create');
        expect(screen.getAllByRole('row')).toHaveLength(4);
        expect(
            screen.getByRole('button', {
                name: 'Changer le statut de Marc Petit',
            }),
        ).toHaveTextContent('Converti');
        expect(screen.getAllByText(/2.500,00/).length).toBeGreaterThan(0);
    });
});
