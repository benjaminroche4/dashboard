import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ Head: () => null, router: { get } }));

import ReportsIndex from '@/pages/reports/index';
import type { Report } from '@/types';

const report: Report = {
    period: { from: '2026-07-01', to: '2026-09-07' },
    leads: {
        total: 12,
        converted: 3,
        archived: 2,
        daily: {
            current: 'Septembre 2026',
            previous: 'Août 2026',
            days: [
                { day: 1, current: 2, previous: 1 },
                { day: 2, current: 1, previous: 3 },
                { day: 3, current: null, previous: 0 },
            ],
        },
        by_offer: [
            { offer: 'accompagne', label: 'Accompagné', count: 5 },
            { offer: 'confie', label: 'Confié', count: 4 },
            { offer: null, label: 'Sans formule', count: 3 },
        ],
        by_assignee: [
            { assignee: 1, label: 'Charles', count: 9, converted: 3 },
            { assignee: null, label: 'Non attribué', count: 3, converted: 0 },
        ],
        conversion_rate: 25,
        by_status: [
            { status: 'todo', label: 'À traiter', count: 4 },
            { status: 'converted', label: 'Converti', count: 3 },
        ],
        by_source: [
            {
                source: 'website',
                label: 'Site web',
                count: 8,
                converted: 2,
                rate: 25,
            },
            {
                source: 'phone',
                label: 'Téléphone',
                count: 4,
                converted: 1,
                rate: 25,
            },
        ],
        first_contact: {
            measured: 10,
            average_minutes: 42,
            within_30_rate: 60,
        },
    },
    quotes: {
        total: 5,
        by_status: [],
        acceptance_rate: 75,
        by_offer: [
            {
                offer: 'accompagne',
                label: 'Accompagné',
                count: 2,
                accepted: 1,
                declined: 1,
                rate: 50,
            },
            {
                offer: 'confie',
                label: 'Confié',
                count: 3,
                accepted: 2,
                declined: 0,
                rate: 100,
            },
        ],
        accepted_amounts: { CHF: 0, EUR: 657_000 },
    },
    visits: {
        total: 4,
        done: 1,
        cancelled: 0,
        weekly: [
            {
                week: '2026-W36',
                label: '31 août – 6 sept.',
                days: [
                    { day: 'Lun', count: 0 },
                    { day: 'Mar', count: 1 },
                    { day: 'Mer', count: 0 },
                    { day: 'Jeu', count: 0 },
                    { day: 'Ven', count: 0 },
                    { day: 'Sam', count: 0 },
                    { day: 'Dim', count: 0 },
                ],
                total: 1,
                daily_average: 0.1,
            },
            {
                week: '2026-W37',
                label: '7 sept. – 13 sept.',
                days: [
                    { day: 'Lun', count: 2 },
                    { day: 'Mar', count: 1 },
                    { day: 'Mer', count: 0 },
                    { day: 'Jeu', count: 0 },
                    { day: 'Ven', count: 0 },
                    { day: 'Sam', count: 0 },
                    { day: 'Dim', count: 0 },
                ],
                total: 3,
                daily_average: 0.4,
            },
        ],
        by_booker: [
            { user: 1, label: 'Charles', count: 3, done: 1, cancelled: 0 },
            { user: 2, label: 'Camille', count: 1, done: 0, cancelled: 0 },
        ],
    },
    invoices: {
        count: 4,
        paid_count: 2,
        issued: { CHF: 50_000, EUR: 300_000 },
        paid: { CHF: 0, EUR: 120_000 },
        overdue: { count: 1, amounts: { CHF: 0, EUR: 40_000 } },
        by_month: [
            {
                month: '2026-07',
                label: 'Juil. 2026',
                issued: { CHF: 0, EUR: 100_000 },
                paid: { CHF: 0, EUR: 0 },
            },
            {
                month: '2026-08',
                label: 'Août 2026',
                issued: { CHF: 50_000, EUR: 100_000 },
                paid: { CHF: 0, EUR: 60_000 },
            },
            {
                month: '2026-09',
                label: 'Sept. 2026',
                issued: { CHF: 0, EUR: 100_000 },
                paid: { CHF: 0, EUR: 60_000 },
            },
        ],
    },
};

const props = {
    report,
    months: 3,
    periods: [3, 6, 12, 24],
    generatedAt: '2026-09-07T10:00:00+00:00',
};

describe('Reports page', () => {
    it('shows the period, the key figures and the tables behind the charts', () => {
        render(<ReportsIndex {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Rapports',
        );
        expect(
            screen.getByText(/Du 01 juil\. 2026 au 07 sept\. 2026/),
        ).toBeInTheDocument();

        const stats = within(
            screen.getByRole('region', { name: 'Chiffres clés' }),
        );
        expect(stats.getByText('12')).toBeInTheDocument();
        expect(stats.getByText('3 converti(s) · 25 %')).toBeInTheDocument();
        expect(stats.getByText('42 min')).toBeInTheDocument();
        expect(stats.getByText('75 %')).toBeInTheDocument();
        expect(stats.getByText(/1.200,00 €/)).toBeInTheDocument();

        const monthly = within(
            screen.getByRole('table', { name: 'Factures par mois en EUR' }),
        );
        expect(monthly.getAllByRole('row')).toHaveLength(4);
        expect(monthly.getByText('Août 2026')).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('table', { name: 'Leads par source' }),
            ).getByText('Téléphone'),
        ).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('table', { name: 'Devis par formule' }),
            ).getByText('Confié'),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Montant des devis acceptés : 6.570,00 €/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('combobox', { name: 'Période' }),
        ).toHaveTextContent('3 derniers mois');
    });

    it('switches the currency tab and reloads on period change', async () => {
        const user = userEvent.setup();
        render(<ReportsIndex {...props} />);

        await user.click(screen.getByRole('tab', { name: 'CHF' }));
        expect(
            screen.getByRole('table', { name: 'Factures par mois en CHF' }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('combobox', { name: 'Période' }));
        await user.click(
            await screen.findByRole('option', { name: '12 derniers mois' }),
        );

        expect(get).toHaveBeenCalledWith(
            '/tools/reports?months=12',
            {},
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('shows empty states without leads or quotes', () => {
        render(
            <ReportsIndex
                {...props}
                report={{
                    ...report,
                    leads: {
                        ...report.leads,
                        by_source: [],
                        first_contact: {
                            measured: 0,
                            average_minutes: null,
                            within_30_rate: null,
                        },
                    },
                    quotes: {
                        ...report.quotes,
                        by_offer: report.quotes.by_offer.map((row) => ({
                            ...row,
                            accepted: 0,
                            declined: 0,
                        })),
                    },
                }}
            />,
        );

        expect(
            screen.getByText('Aucun lead sur la période.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Aucun devis sur la période.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Aucun lead contacté')).toBeInTheDocument();
    });

    it('shows the visits per week and the visits booked per member', () => {
        render(<ReportsIndex {...props} />);

        const weekly = within(
            screen.getByRole('region', { name: 'Visites par semaine' }),
        );
        expect(weekly.getByTestId('weekly-visits-summary')).toHaveTextContent(
            '3 cette semaine',
        );
        expect(
            weekly.getByRole('cell', { name: '7 sept. – 13 sept.' }),
        ).toBeInTheDocument();

        const booked = within(
            screen.getByRole('region', {
                name: 'Visites réservées par membre',
            }),
        );
        const charles = booked.getByRole('row', { name: /Charles/ });
        expect(charles).toHaveTextContent('Charles31');
    });
});
