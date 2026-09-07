import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonthlyLeadsChart } from '@/components/reports/monthly-leads-chart';

describe('MonthlyLeadsChart', () => {
    it('sums both months, compares to date and exposes the daily table', () => {
        const { container } = render(
            <MonthlyLeadsChart
                daily={{
                    current: 'Septembre 2026',
                    previous: 'Août 2026',
                    days: [
                        { day: 1, current: 2, previous: 0 },
                        { day: 2, current: 3, previous: 1 },
                        { day: 3, current: null, previous: 4 },
                    ],
                }}
            />,
        );

        const summary = container.querySelector(
            '[data-test="monthly-leads-summary"]',
        );
        expect(summary).toHaveTextContent('5 lead(s) ce mois-ci');
        expect(summary).toHaveTextContent('+4 à date · 5 le mois dernier');
        expect(
            screen.getByText('Septembre 2026 contre Août 2026, jour par jour.'),
        ).toBeInTheDocument();
        const table = screen.getByRole('table', { name: 'Leads par jour' });
        expect(table).toHaveTextContent('—');
        expect(
            screen.getByText('Voir les valeurs jour par jour'),
        ).toBeInTheDocument();
    });
});
