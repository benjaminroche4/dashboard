import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { role } = vi.hoisted(() => ({ role: { value: 'admin' } }));

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: vi.fn(), get },
    usePage: () => ({ props: { auth: { user: { role: role.value } } } }),
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
}));

import InvoicesIndex from '@/pages/invoices/index';
import type { Invoice } from '@/types';

const invoice = (id: number, status: Invoice['status']): Invoice => ({
    id,
    uuid: `0199a9a0-0000-7000-8000-0000000001${String(id).padStart(2, '0')}`,
    number: `F-2026-000${id}`,
    client_name: `Client ${id}`,
    client_email: null,
    amount_cents: 100_000,
    currency: 'CHF',
    status,
    status_label: status,
    issued_at: '2026-09-01',
    due_at: '2026-10-01',
    paid_at: null,
    deposit_cents: 0,
    due_cents: 0,
    can_send: true,
    can_pay: true,
    lead: null,
});

const pagination = { current_page: 1, last_page: 1, per_page: 50, total: 3 };
const filters = {
    q: '',
    sort: 'issued_at',
    dir: 'desc' as const,
    status: null,
};

describe('Invoices page', () => {
    it('shows the title, the summary with overdue count, the button and the panel table', () => {
        const { container } = render(
            <InvoicesIndex
                invoices={[
                    invoice(1, 'paid'),
                    invoice(2, 'overdue'),
                    invoice(3, 'overdue'),
                ]}
                statuses={[]}
                pagination={pagination}
                filters={filters}
                overdueCount={2}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Factures',
        );
        expect(
            screen.getByText('3 facture(s) · 2 en retard'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Nouvelle facture/ }),
        ).toHaveAttribute('href', '/invoices/create');
        expect(
            container.querySelector('.bg-sidebar.rounded-xl'),
        ).not.toBeNull();
        expect(screen.getAllByRole('row')).toHaveLength(4);
    });

    it('omits the overdue mention when there is none', () => {
        render(
            <InvoicesIndex
                invoices={[invoice(1, 'paid')]}
                statuses={[]}
                pagination={{ ...pagination, total: 1 }}
                filters={filters}
                overdueCount={0}
            />,
        );

        expect(screen.getByText('1 facture(s)')).toBeInTheDocument();
    });

    it('shows the bulk actions to managers once a row is selected, never to members', async () => {
        const { userEvent } = await import('@testing-library/user-event');
        const user = userEvent.setup();
        const { unmount } = render(
            <InvoicesIndex
                invoices={[invoice(1, 'draft'), invoice(2, 'sent')]}
                statuses={[]}
                pagination={{ ...pagination, total: 2 }}
                filters={filters}
                overdueCount={0}
            />,
        );

        expect(
            screen.queryByRole('group', { name: 'Actions groupées' }),
        ).toBeNull();
        await user.click(
            screen.getByRole('checkbox', { name: 'Tout sélectionner' }),
        );
        expect(
            screen.getByRole('group', { name: 'Actions groupées' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Envoyer \(2\)/ }),
        ).toBeInTheDocument();
        unmount();

        role.value = 'member';
        render(
            <InvoicesIndex
                invoices={[invoice(1, 'draft')]}
                statuses={[]}
                pagination={{ ...pagination, total: 1 }}
                filters={filters}
                overdueCount={0}
            />,
        );
        await user.click(
            screen.getByRole('checkbox', { name: 'Tout sélectionner' }),
        );
        expect(
            screen.queryByRole('group', { name: 'Actions groupées' }),
        ).toBeNull();
        role.value = 'admin';
    });

    it('paginates, searches and sorts on the server', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { userEvent } = await import('@testing-library/user-event');
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        get.mockReset();
        render(
            <InvoicesIndex
                invoices={[invoice(1, 'paid')]}
                statuses={[]}
                pagination={{
                    current_page: 2,
                    last_page: 4,
                    per_page: 50,
                    total: 180,
                }}
                filters={filters}
                overdueCount={0}
            />,
        );

        expect(screen.getByText('180 facture(s)')).toBeInTheDocument();
        expect(screen.getByText('Page 2 sur 4')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Suivant' }));
        expect(get).toHaveBeenLastCalledWith(
            '/invoices',
            { sort: 'issued_at', dir: 'desc', page: 3 },
            expect.objectContaining({
                preserveState: true,
                only: expect.arrayContaining(['invoices']),
            }),
        );

        await user.type(
            screen.getByRole('searchbox', {
                name: 'Rechercher un numéro ou un client…',
            }),
            'RP-27',
        );
        vi.advanceTimersByTime(350);
        expect(get).toHaveBeenLastCalledWith(
            '/invoices',
            { q: 'RP-27', sort: 'issued_at', dir: 'desc' },
            expect.anything(),
        );

        await user.click(screen.getByRole('button', { name: /Client/ }));
        expect(get).toHaveBeenLastCalledWith(
            '/invoices',
            expect.objectContaining({ sort: 'client_name', dir: 'asc' }),
            expect.anything(),
        );
        vi.useRealTimers();
    });
});
