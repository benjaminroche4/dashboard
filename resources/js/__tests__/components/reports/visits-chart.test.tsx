import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisitsChart } from '@/components/reports/visits-chart';

const visits = {
    total: 3,
    series: [
        { label: '7 sept.', count: 2 },
        { label: '8 sept.', count: 1 },
        { label: '9 sept.', count: 0 },
    ],
    by_booker: [],
};

describe('VisitsChart', () => {
    it('sums the visits of the period and names its busiest slice', () => {
        render(<VisitsChart visits={visits} />);

        const summary = screen.getByTestId('visits-summary');
        expect(summary).toHaveTextContent('3 visite(s) sur la période');
        expect(summary).toHaveTextContent('Pic : 2 · 7 sept.');
    });

    it('stays silent about the peak when nothing happened', () => {
        render(
            <VisitsChart
                visits={{
                    total: 0,
                    series: [{ label: '9 sept.', count: 0 }],
                    by_booker: [],
                }}
            />,
        );

        expect(screen.getByTestId('visits-summary')).not.toHaveTextContent(
            'Pic',
        );
    });
});
