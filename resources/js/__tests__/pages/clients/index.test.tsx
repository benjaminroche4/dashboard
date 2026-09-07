import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

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
        expect(screen.getByText('1 facture · 2 demandes')).toBeInTheDocument();
        expect(screen.getByText('0 facture · 1 demande')).toBeInTheDocument();
    });

    it('declares breadcrumbs under Clients', () => {
        expect(
            ClientsIndex.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Clients', 'Dossiers']);
        expect(ClientsIndex.layout.breadcrumbs[0]?.href.url).toBe('/clients');
    });
});
