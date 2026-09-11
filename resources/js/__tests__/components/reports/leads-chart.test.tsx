import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
    barLabel,
    labelsEverywhere,
    tickInterval,
} from '@/components/reports/chart-scale';
import { LeadsChart } from '@/components/reports/leads-chart';

const leads = {
    total: 5,
    previous_total: 3,
    previous_label: 'Du 1 août 2026 au 31 août 2026',
    series: [
        { label: '1 sept.', current: 2, previous: 0 },
        { label: '2 sept.', current: 3, previous: 3 },
    ],
};

describe('chart scale', () => {
    it('keeps every tick when the curve is short, thins it out beyond twelve', () => {
        expect(tickInterval(5)).toBe(0);
        expect(tickInterval(12)).toBe(0);
        expect(tickInterval(24)).toBe(1);
        expect(tickInterval(30)).toBe(2);
    });

    it('writes a figure on every bar of a short curve, only on the peak of a long one', () => {
        expect(labelsEverywhere(12)).toBe(true);
        expect(labelsEverywhere(13)).toBe(false);

        // Courbe courte : chaque barre non vide porte son chiffre.
        expect(barLabel(3, { everywhere: true, peak: 9 })).toBe('3');
        expect(barLabel(0, { everywhere: true, peak: 9 })).toBe('');
        // Courbe longue : seul le pic est annoté.
        expect(barLabel(3, { everywhere: false, peak: 9 })).toBe('');
        expect(barLabel(9, { everywhere: false, peak: 9 })).toBe('9');
    });
});

describe('LeadsChart', () => {
    it('sums the period, compares it to the previous one and folds the values away', async () => {
        const { container } = render(<LeadsChart leads={leads} />);

        const summary = container.querySelector('[data-test="leads-summary"]');
        expect(summary).toHaveTextContent('5 lead(s) sur la période');
        expect(summary).toHaveTextContent('+2 · 3 avant');
        expect(
            screen.getByText(/du 1 août 2026 au 31 août 2026/),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('table', {
                name: 'Leads par tranche de la période',
            }),
        ).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Voir les valeurs tranche par tranche',
            }),
        );
        expect(
            screen.getByRole('table', {
                name: 'Leads par tranche de la période',
            }),
        ).toHaveTextContent('2 sept.');
    });
});
