import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ Head: () => null, router: { get } }));

import ReportsIndex from '@/pages/reports/index';
import type { Report } from '@/types';

const report: Report = {
    period: { from: '2026-07-01', to: '2026-09-07' },
    granularity: 'day',
    leads: {
        total: 12,
        previous_total: 8,
        previous_label: 'Du 12 juil. 2026 au 10 août 2026',
        series: [
            { label: '7 sept.', current: 2, previous: 1 },
            { label: '8 sept.', current: 1, previous: 3 },
            { label: '9 sept.', current: 0, previous: 0 },
        ],
    },
    visits: {
        total: 4,
        series: [
            { label: '7 sept.', count: 3 },
            { label: '8 sept.', count: 1 },
            { label: '9 sept.', count: 0 },
        ],
        by_booker: [
            {
                name: 'Charles',
                avatar: '/storage/avatars/charles.jpg',
                total: 3,
                done: 1,
                cancelled: 0,
            },
            {
                name: 'Sans auteur',
                avatar: null,
                total: 1,
                done: 0,
                cancelled: 1,
            },
        ],
    },
};

const periods = [
    { value: 'day', label: "Aujourd'hui" },
    { value: 'week', label: '7 derniers jours' },
    { value: 'days30', label: '30 derniers jours' },
    { value: 'months6', label: '6 derniers mois' },
    { value: 'months12', label: '12 derniers mois' },
    { value: 'custom', label: 'Période personnalisée' },
];

const props = {
    report,
    period: 'days30',
    periods,
    generatedAt: '2026-09-07T10:00:00+00:00',
};

describe('Reports page', () => {
    it('shows the period and the two key figures only', () => {
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
        expect(stats.getByText('Leads reçus')).toBeInTheDocument();
        expect(stats.getByText('12')).toBeInTheDocument();
        expect(stats.getByText('Visites réservées')).toBeInTheDocument();
        expect(stats.getByText('4')).toBeInTheDocument();

        expect(
            screen.queryByRole('region', { name: 'Détail des leads' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Factures par mois')).not.toBeInTheDocument();
        expect(screen.queryByText('Devis')).not.toBeInTheDocument();
    });

    it('draws both curves over the chosen period, not over a fixed window', () => {
        const { container } = render(<ReportsIndex {...props} />);

        // Les totaux des courbes sont ceux de la période, pas ceux du mois en cours.
        expect(
            container.querySelector('[data-test="leads-summary"]'),
        ).toHaveTextContent('12 lead(s) sur la période');
        expect(screen.getByTestId('visits-summary')).toHaveTextContent(
            '4 visite(s) sur la période',
        );

        const visits = within(screen.getByRole('region', { name: 'Visites' }));
        expect(
            visits.getByText(/sur la période choisie, hors annulées/i),
        ).toBeInTheDocument();
    });

    it('lists who booked the visits of the period', () => {
        render(<ReportsIndex {...props} />);

        const bookers = within(
            screen.getByRole('region', {
                name: 'Visites réservées par membre',
            }),
        );
        const rows = bookers.getAllByRole('listitem');
        // Classement décroissant : l'avatar du membre précède son nom.
        expect(rows[0]).toHaveTextContent('Charles');
        // Radix ne peint l'image qu'une fois chargée : en test, l'initiale tient la place.
        expect(rows[0]).toHaveTextContent('C');
        expect(rows[0]).toHaveTextContent('75 % · 1 effectuée · 0 annulée');
        // Sans photo, les initiales prennent le relais.
        expect(rows[1]).toHaveTextContent('Sans auteur');
        expect(rows[1]).toHaveTextContent('SA');
    });

    it('reloads on a shortcut period, day to twelve months', async () => {
        const user = userEvent.setup();
        render(<ReportsIndex {...props} />);

        expect(
            screen.getByRole('combobox', { name: 'Période' }),
        ).toHaveTextContent('30 derniers jours');

        await user.click(screen.getByRole('combobox', { name: 'Période' }));
        await user.click(
            await screen.findByRole('option', { name: "Aujourd'hui" }),
        );

        expect(get).toHaveBeenCalledWith(
            '/tools/reports?period=day',
            {},
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('opens the calendar when « Période personnalisée » is chosen from a shortcut', async () => {
        const user = userEvent.setup();
        get.mockClear();
        // On part d'un raccourci : le calendrier doit s'ouvrir sans recharger,
        // le serveur ne connaît la période qu'une fois les deux bornes posées.
        render(<ReportsIndex {...props} period="days30" />);

        expect(
            screen.queryByRole('button', { name: 'Dates de la période' }),
        ).toBeNull();

        await user.click(screen.getByRole('combobox', { name: 'Période' }));
        await user.click(
            await screen.findByRole('option', {
                name: 'Période personnalisée',
            }),
        );

        expect(get).not.toHaveBeenCalled();
        // La plage courante sert de point de départ à l'ajustement.
        expect(
            screen.getByRole('button', { name: 'Dates de la période' }),
        ).toHaveTextContent('1 juil. 2026 – 7 sept. 2026');
        console.log(
            'BUTTONS',
            screen
                .getAllByRole('button', { hidden: true })
                .map((b) => b.textContent)
                .slice(0, 12),
        );
        console.log(
            'GRIDCELLS',
            document.querySelectorAll('[role="gridcell"], .rdp-day, table')
                .length,
        );
        // Le calendrier est ouvert : on peut poser les deux bornes dans la foulée.
        await user.click(
            await screen.findByRole('button', { name: /^\S+ 5 juillet 2026/ }),
        );
        await user.click(
            screen.getByRole('button', { name: /^\S+ 20 juillet 2026/ }),
        );
        expect(get).toHaveBeenCalledWith(
            '/tools/reports?period=custom&from=2026-07-05&to=2026-07-20',
            {},
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('sends a custom period once both ends are picked in the single calendar', async () => {
        const user = userEvent.setup();
        get.mockClear();
        render(<ReportsIndex {...props} period="custom" />);

        // Un seul champ, qui montre la plage courante.
        await user.click(
            screen.getByRole('button', { name: 'Dates de la période' }),
        );
        // Premier clic : début, la requête attend la seconde borne.
        await user.click(
            await screen.findByRole('button', { name: /^\S+ 5 juillet 2026/ }),
        );
        expect(get).not.toHaveBeenCalled();

        await user.click(
            screen.getByRole('button', { name: /^\S+ 20 juillet 2026/ }),
        );

        expect(get).toHaveBeenCalledWith(
            '/tools/reports?period=custom&from=2026-07-05&to=2026-07-20',
            {},
            expect.objectContaining({ preserveState: true }),
        );
    });
});
