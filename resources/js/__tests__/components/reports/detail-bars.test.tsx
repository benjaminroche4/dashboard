import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailBars } from '@/components/reports/detail-bars';

describe('DetailBars', () => {
    it('renders the table of values with one column per series', () => {
        render(
            <DetailBars
                title="Leads par source"
                rows={[
                    {
                        id: 'website',
                        label: 'Site web',
                        values: { count: 8, converted: 2 },
                    },
                    {
                        id: 'phone',
                        label: 'Téléphone',
                        values: { count: 4, converted: 1 },
                    },
                ]}
                series={[
                    { key: 'count', label: 'Leads', tone: 'primary' },
                    { key: 'converted', label: 'Convertis', tone: 'success' },
                ]}
            />,
        );

        const table = within(
            screen.getByRole('table', { name: 'Leads par source' }),
        );
        expect(
            table.getAllByRole('columnheader').map((cell) => cell.textContent),
        ).toEqual(['Catégorie', 'Leads', 'Convertis']);
        expect(table.getAllByRole('row')).toHaveLength(3);
        expect(table.getByText('Téléphone')).toBeInTheDocument();
    });

    it('shows the empty message when the first series sums to zero', () => {
        render(
            <DetailBars
                title="Leads par statut"
                empty="Rien à afficher."
                rows={[
                    { id: 'todo', label: 'À traiter', values: { count: 0 } },
                ]}
                series={[{ key: 'count', label: 'Leads', tone: 'primary' }]}
            />,
        );

        expect(screen.getByText('Rien à afficher.')).toBeInTheDocument();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
