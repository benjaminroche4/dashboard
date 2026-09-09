import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
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

import Dashboard from '@/pages/dashboard';
import { makeLead } from '@/test/fixtures/lead';

describe('Dashboard page', () => {
    it('shows the « Mon travail » card with the assigned leads', () => {
        render(
            <Dashboard
                mine={{
                    leads: { total: 1, items: [makeLead()] },
                    owner_leads: null,
                    clients: { total: 0, items: [] },
                }}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Tableau de bord',
        );
        expect(
            screen.getByRole('region', { name: 'Mon travail' }),
        ).toHaveTextContent('Léa Durand');
        expect(Dashboard.layout.breadcrumbs[0]?.href.url).toBe('/dashboard');
    });
});
