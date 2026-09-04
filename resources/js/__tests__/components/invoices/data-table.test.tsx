import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataTable } from '@/components/data-table';
import {
    invoiceColumnLabels,
    invoiceColumns,
} from '@/components/invoices/columns';
import type { Invoice } from '@/types';

const invoices: Invoice[] = [
    {
        id: 1,
        number: 'F-2026-0001',
        client_name: 'Acme SAS',
        client_email: 'compta@acme.fr',
        amount_cents: 120_000,
        currency: 'EUR',
        status: 'paid',
        status_label: 'Payée',
        issued_at: '2026-09-01',
        due_at: '2026-10-01',
        paid_at: '2026-09-15',
    },
    {
        id: 2,
        number: 'F-2026-0002',
        client_name: 'Globex',
        client_email: null,
        amount_cents: 45_050,
        currency: 'EUR',
        status: 'overdue',
        status_label: 'En retard',
        issued_at: '2026-07-01',
        due_at: '2026-07-31',
        paid_at: null,
    },
];

function renderTable(data = invoices) {
    return render(
        <DataTable
            columns={invoiceColumns}
            data={data}
            filterColumn="client_name"
            filterPlaceholder="Filtrer par client…"
            columnLabels={invoiceColumnLabels}
        />,
    );
}

describe('Invoices DataTable', () => {
    it('renders invoice rows with badge, money and dates', () => {
        renderTable();

        const row = screen.getByRole('row', { name: /F-2026-0001/ });
        expect(within(row).getByText('Acme SAS')).toBeInTheDocument();
        expect(within(row).getByText('Payée')).toHaveClass(
            'bg-green-50',
            'text-green-700',
        );
        expect(
            within(screen.getByRole('row', { name: /F-2026-0002/ })).getByText(
                'En retard',
            ),
        ).toHaveClass('bg-red-50', 'text-red-700');
        expect(within(row).getByText(/1.200,00.€/)).toBeInTheDocument();
        expect(within(row).getByText('01 sept. 2026')).toBeInTheDocument();
        expect(
            screen.getByText('0 sur 2 ligne(s) sélectionnée(s).'),
        ).toBeInTheDocument();
    });

    it('filters by client', async () => {
        const user = userEvent.setup();
        renderTable();

        await user.type(
            screen.getByPlaceholderText('Filtrer par client…'),
            'glob',
        );

        expect(screen.queryByText('Acme SAS')).toBeNull();
        expect(screen.getByText('Globex')).toBeInTheDocument();
    });

    it('selects all rows from the header checkbox', async () => {
        const user = userEvent.setup();
        renderTable();

        await user.click(
            screen.getByRole('checkbox', { name: 'Tout sélectionner' }),
        );

        expect(
            screen.getByText('2 sur 2 ligne(s) sélectionnée(s).'),
        ).toBeInTheDocument();
    });

    it('sorts by amount when the header is clicked', async () => {
        const user = userEvent.setup();
        renderTable();

        await user.click(screen.getByRole('button', { name: 'Montant' }));

        const rows = screen.getAllByRole('row').slice(1);
        expect(rows[0]).toHaveTextContent('Globex');
    });

    it('hides the pagination when everything fits on one page', () => {
        renderTable();

        expect(screen.queryByRole('button', { name: 'Suivant' })).toBeNull();
    });

    it('shows the pagination beyond 50 rows', () => {
        const many = Array.from({ length: 51 }, (_, index) => ({
            ...invoices[0],
            id: index + 1,
            number: `F-2026-${String(index + 1).padStart(4, '0')}`,
        }));
        renderTable(many);

        expect(screen.getAllByRole('row')).toHaveLength(51);
        expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
    });

    it('shows an empty state', () => {
        renderTable([]);

        expect(screen.getByText('Aucun résultat.')).toBeInTheDocument();
    });
});
