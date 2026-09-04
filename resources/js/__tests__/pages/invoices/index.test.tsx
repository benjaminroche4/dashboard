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
}));

import InvoicesIndex from '@/pages/invoices/index';
import type { Invoice } from '@/types';

const invoice = (id: number, status: Invoice['status']): Invoice => ({
    id,
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
});

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
        render(<InvoicesIndex invoices={[invoice(1, 'paid')]} statuses={[]} />);

        expect(screen.getByText('1 facture(s)')).toBeInTheDocument();
    });
});
