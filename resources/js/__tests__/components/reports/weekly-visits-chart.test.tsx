import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeeklyVisitsChart } from '@/components/reports/weekly-visits-chart';
import type { ReportWeek } from '@/types';

const week = (label: string, counts: number[], weekId: string): ReportWeek => ({
    week: weekId,
    label,
    days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(
        (day, index) => ({ day, count: counts[index] ?? 0 }),
    ),
    total: counts.reduce((sum, count) => sum + count, 0),
    daily_average:
        Math.round((counts.reduce((sum, count) => sum + count, 0) / 7) * 10) /
        10,
});

describe('WeeklyVisitsChart', () => {
    it('sums the current week and lists each day of each week in the table', () => {
        render(
            <WeeklyVisitsChart
                weeks={[
                    week(
                        '31 août – 6 sept.',
                        [0, 1, 0, 0, 0, 0, 0],
                        '2026-W36',
                    ),
                    week(
                        '7 sept. – 13 sept.',
                        [2, 1, 0, 0, 0, 0, 0],
                        '2026-W37',
                    ),
                ]}
            />,
        );

        expect(screen.getByTestId('weekly-visits-summary')).toHaveTextContent(
            '3 cette semaine',
        );
        expect(screen.getByTestId('weekly-visits-summary')).toHaveTextContent(
            '4 sur huit semaines · 0,3 par jour',
        );
        const table = within(screen.getByRole('table'));
        expect(
            table.getByRole('columnheader', { name: 'Dim' }),
        ).toBeInTheDocument();
        const rows = table.getAllByRole('row').slice(1);
        expect(rows[1]).toHaveTextContent('7 sept. – 13 sept.');
        expect(
            within(rows[1] as HTMLElement)
                .getAllByRole('cell')
                .map((cell) => cell.textContent),
        ).toEqual([
            '7 sept. – 13 sept.',
            '2',
            '1',
            '0',
            '0',
            '0',
            '0',
            '0',
            '3',
            '0,4',
        ]);
    });

    it('shows an empty state without any visit', () => {
        render(
            <WeeklyVisitsChart
                weeks={[
                    week(
                        '7 sept. – 13 sept.',
                        [0, 0, 0, 0, 0, 0, 0],
                        '2026-W37',
                    ),
                ]}
            />,
        );

        expect(
            screen.getByText('Aucune visite sur les huit dernières semaines.'),
        ).toBeInTheDocument();
    });
});
