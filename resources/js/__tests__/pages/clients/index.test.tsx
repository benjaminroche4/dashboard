import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    // La page lit le membre connecté pour le filtre « Mes dossiers ».
    usePage: () => ({ props: { auth: { user: { id: 1, role: 'admin' } } } }),
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
import { makeClient, clientPriorities } from '@/test/fixtures/client';

describe('Clients index page', () => {
    it('lists the converted leads with contact, offer, dates, assignee and dossier counts', () => {
        render(
            <ClientsIndex
                priorities={clientPriorities}
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

    it('shows the priority of each dossier in its own column', () => {
        render(
            <ClientsIndex
                clients={[
                    makeClient({
                        priority: 'urgent',
                        priority_label: 'Urgente',
                    }),
                    makeClient({
                        id: 2,
                        uuid: 'client-2',
                        name: 'Paul Roux',
                        priority: 'normal',
                        priority_label: 'Normale',
                    }),
                ]}
                priorities={clientPriorities}
            />,
        );

        expect(
            screen.getByRole('columnheader', { name: /Priorité/ }),
        ).toBeInTheDocument();
        // La colonne montre aussi « Normale », que la pastille cache ailleurs.
        expect(screen.getByLabelText('Priorité : Urgente')).toBeInTheDocument();
        expect(screen.getByLabelText('Priorité : Normale')).toBeInTheDocument();
    });

    it('puts a miniature folder next to each client name that opens when the row is hovered', () => {
        render(
            <ClientsIndex
                priorities={clientPriorities}
                clients={[makeClient()]}
            />,
        );

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

    it('filters the dossiers on the columns: priority, offer, follower and arrival', async () => {
        const user = userEvent.setup();
        render(
            <ClientsIndex
                priorities={clientPriorities}
                offers={[
                    { value: 'accompagne', label: 'Accompagné' },
                    { value: 'confie', label: 'Confié' },
                ]}
                clients={[
                    makeClient({
                        id: 1,
                        name: 'Léa Durand',
                        offer: 'accompagne',
                        offer_label: 'Accompagné',
                    }),
                    makeClient({
                        id: 2,
                        uuid: 'lead-2',
                        name: 'Paul Levy',
                        offer: 'confie',
                        offer_label: 'Confié',
                        assignee: null,
                    }),
                ]}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Filtres/ }));
        const menu = screen.getByRole('menu');
        // Un critère par colonne filtrable.
        for (const title of ['Priorité', 'Formule', 'Suivi par', 'Arrivée']) {
            expect(within(menu).getByText(title)).toBeInTheDocument();
        }

        await user.click(
            within(menu).getByRole('menuitemcheckbox', { name: /Confié/ }),
        );
        await user.keyboard('{Escape}');

        expect(
            screen.queryByRole('link', { name: 'Léa Durand' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Paul Levy' }),
        ).toBeInTheDocument();
        // Le bouton compte les filtres actifs, tous critères confondus.
        expect(
            screen.getByRole('button', { name: /Filtres/ }),
        ).toHaveTextContent('1');
    });

    it('filters the dossiers by priority', async () => {
        const user = userEvent.setup();
        render(
            <ClientsIndex
                priorities={clientPriorities}
                clients={[
                    makeClient({ id: 1, name: 'Léa Durand' }),
                    makeClient({
                        id: 2,
                        uuid: 'lead-2',
                        name: 'Paul Levy',
                        priority: 'urgent',
                        priority_label: 'Urgente',
                        priority_rank: 3,
                    }),
                ]}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Filtres/ }));
        await user.click(
            await screen.findByRole('menuitemcheckbox', { name: /Urgente/ }),
        );
        await user.keyboard('{Escape}');

        expect(
            screen.getByText(
                '1 client : les leads convertis, suivis jusqu’à l’installation.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Léa Durand' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Paul Levy' }),
        ).toBeInTheDocument();
    });

    it('restricts the list to the dossiers the member follows', async () => {
        const user = userEvent.setup();
        render(
            <ClientsIndex
                priorities={clientPriorities}
                clients={[
                    makeClient({ id: 1, name: 'Léa Durand' }),
                    makeClient({
                        id: 2,
                        uuid: 'lead-2',
                        name: 'Paul Levy',
                        assignee: { id: 9, name: 'Admin 2', avatar: null },
                    }),
                    makeClient({
                        id: 3,
                        uuid: 'lead-3',
                        name: 'Alain Devaux',
                        assignee: null,
                        // Suivi en second : le dossier compte quand même.
                        co_assignee: { id: 1, name: 'Admin', avatar: null },
                    }),
                ]}
            />,
        );

        const toggle = screen.getByRole('button', { name: 'Mes dossiers (2)' });
        expect(screen.getByText('Paul Levy')).toBeInTheDocument();

        await user.click(toggle);

        expect(toggle).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Léa Durand')).toBeInTheDocument();
        expect(screen.getByText('Alain Devaux')).toBeInTheDocument();
        expect(screen.queryByText('Paul Levy')).not.toBeInTheDocument();

        await user.click(toggle);
        expect(screen.getByText('Paul Levy')).toBeInTheDocument();
    });
});
