import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
        prefetch: _prefetch,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
        prefetch?: boolean;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import ClientsIndex from '@/pages/clients/index';
import { makeClient } from '@/test/fixtures/client';

describe('Clients index page', () => {
    it('lists the converted leads with contact, offer, dates, assignee and dossier counts', () => {
        render(
            <ClientsIndex
                clients={[
                    makeClient(),
                    makeClient({
                        id: 2,
                        uuid: '0199a9a0-0000-7000-8000-0000000000e2',
                        name: 'Noah Martin',
                        company: null,
                        reference: 'LD-9001',
                        email: null,
                        phone: null,
                        offer_label: null,
                        assignee: null,
                        invoices_count: 0,
                        document_requests_count: 1,
                    }),
                ]}
            />,
        );

        expect(screen.getByText(/2 clients/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute(
            'href',
            '/clients/0199a9a0-0000-7000-8000-0000000000e1',
        );
        expect(screen.getByText('Nestlé')).toBeInTheDocument();
        expect(screen.getByText('LD-9001')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'lea@example.com' }),
        ).toHaveAttribute('href', 'mailto:lea@example.com');
        expect(screen.getByText('Confié')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Non attribué')).toBeInTheDocument();
        // La colonne Arrivée est une barre d'avancement vers la date d'arrivée.
        const bars = screen.getAllByRole('progressbar', {
            name: 'Avancement vers l’arrivée',
        });
        expect(bars.length).toBeGreaterThan(0);
        expect(bars[0]).toHaveAttribute('aria-valuemax', '100');
        expect(screen.queryByText(/facture/)).toBeNull();
    });

    it('puts a miniature folder next to each client name that opens when the row is hovered', () => {
        render(<ClientsIndex clients={[makeClient()]} />);

        const row = screen
            .getByRole('link', { name: 'Léa Durand' })
            .closest('tr');
        expect(row).toHaveClass('group');
        expect(
            row?.querySelectorAll('img[src="/images/folder/front.svg"]'),
        ).toHaveLength(1);
        expect(row?.querySelector('.translate-y-12')).toHaveClass(
            'group-hover:translate-y-0',
        );
    });

    it('declares breadcrumbs under Clients', () => {
        expect(
            ClientsIndex.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Clients', 'Dossiers']);
        expect(ClientsIndex.layout.breadcrumbs[0]?.href.url).toBe('/clients');
    });
});
