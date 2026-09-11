import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { get },
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import ActivityIndex, { dayLabel, groupByDay } from '@/pages/tools/activity';
import { show as leadShow } from '@/routes/leads';
import {
    activityMembers,
    activityPeriods,
    activityResources,
    makeActivity,
    makeActivityPage,
} from '@/test/fixtures/activity';

const now = new Date('2026-09-08T14:00:00+02:00');

const props = {
    members: activityMembers,
    resources: activityResources,
    periods: activityPeriods,
    filters: { period: 'month', member: null, resource: null, lead: null },
    lead: null,
};

describe('dayLabel and groupByDay', () => {
    it('labels today, yesterday and older days', () => {
        expect(dayLabel('2026-09-08T09:30:00+02:00', now)).toBe("Aujourd'hui");
        expect(dayLabel('2026-09-07T23:30:00+02:00', now)).toBe('Hier');
        expect(dayLabel('2026-09-01T10:00:00+02:00', now)).toBe(
            'Mardi 1 septembre 2026',
        );
    });

    it('groups consecutive entries of the same day', () => {
        const groups = groupByDay(
            [
                makeActivity({
                    id: 1,
                    created_at: '2026-09-08T10:00:00+02:00',
                }),
                makeActivity({
                    id: 2,
                    created_at: '2026-09-08T08:00:00+02:00',
                }),
                makeActivity({
                    id: 3,
                    created_at: '2026-09-07T08:00:00+02:00',
                }),
            ],
            now,
        );

        expect(
            groups.map((group) => [group.label, group.items.length]),
        ).toEqual([
            ["Aujourd'hui", 2],
            ['Hier', 1],
        ]);
    });
});

describe('Activity log page', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(now);
        get.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('lists the entries by day with the actor, the message, the resource and the lead link', () => {
        render(
            <ActivityIndex
                {...props}
                activities={makeActivityPage({
                    data: [
                        makeActivity(),
                        makeActivity({
                            id: 2,
                            actor: null,
                            message: 'a créé la facture RP-27001',
                            resource: 'invoices',
                            resource_label: 'Factures',
                            lead: null,
                            created_at: '2026-09-07T18:00:00+02:00',
                        }),
                    ],
                    total: 2,
                })}
            />,
        );

        expect(
            screen.getByRole('heading', { name: "Journal d'activité" }),
        ).toBeInTheDocument();
        const today = screen.getByRole('region', { name: "Aujourd'hui" });
        expect(today).toHaveTextContent('Admin a créé le lead Léa Durand');
        expect(today).toHaveTextContent('Leads');
        expect(
            within(today).getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute(
            'href',
            leadShow({ lead: '0199a9a0-0000-7000-8000-0000000000e1' }).url,
        );

        const yesterday = screen.getByRole('region', { name: 'Hier' });
        expect(yesterday).toHaveTextContent(
            'Le système a créé la facture RP-27001',
        );
        expect(within(yesterday).queryByRole('link')).toBeNull();
        expect(
            screen.queryByRole('navigation', { name: 'Pagination' }),
        ).toBeNull();
    });

    it('shows an empty state and the filtered lead', () => {
        render(
            <ActivityIndex
                {...props}
                activities={makeActivityPage({ data: [], total: 0 })}
                filters={{
                    period: 'month',
                    member: null,
                    resource: null,
                    lead: '0199a9a0-0000-7000-8000-0000000000e1',
                }}
                lead={{
                    id: 1,
                    uuid: '0199a9a0-0000-7000-8000-0000000000e1',
                    name: 'Léa Durand',
                }}
            />,
        );

        expect(
            screen.getByText('Aucune activité sur cette période.'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute(
            'href',
            leadShow({ lead: '0199a9a0-0000-7000-8000-0000000000e1' }).url,
        );
        expect(
            screen.getByRole('link', { name: 'Tout le journal' }),
        ).toHaveAttribute('href', '/tools/activity');
    });

    it('reloads with the member and resource filters', async () => {
        const user = userEvent.setup({
            advanceTimers: vi.advanceTimersByTime,
        });
        render(
            <ActivityIndex
                {...props}
                activities={makeActivityPage()}
                filters={{
                    period: 'month',
                    member: 2,
                    resource: null,
                    lead: 'lead-uuid',
                }}
            />,
        );

        expect(
            screen.getByRole('combobox', { name: 'Membre' }),
        ).toHaveTextContent('Admin 2');

        await user.click(screen.getByRole('combobox', { name: 'Ressource' }));
        await user.click(
            await screen.findByRole('option', { name: 'Factures' }),
        );
        expect(get).toHaveBeenCalledWith(
            '/tools/activity?period=month&member=2&resource=invoices&lead=lead-uuid',
            {},
            expect.objectContaining({ preserveState: true }),
        );

        await user.click(screen.getByRole('combobox', { name: 'Membre' }));
        await user.click(
            await screen.findByRole('option', { name: 'Tous les membres' }),
        );
        expect(get).toHaveBeenLastCalledWith(
            '/tools/activity?period=month&lead=lead-uuid',
            {},
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('filters by period and drops the default from the query', async () => {
        const user = userEvent.setup({
            advanceTimers: vi.advanceTimersByTime,
        });
        render(<ActivityIndex {...props} activities={makeActivityPage()} />);

        const period = screen.getByRole('combobox', { name: 'Période' });
        expect(period).toHaveTextContent('30 derniers jours');

        await user.click(period);
        await user.click(
            await screen.findByRole('option', { name: '7 derniers jours' }),
        );
        expect(get).toHaveBeenCalledWith(
            '/tools/activity?period=week',
            {},
            expect.objectContaining({ preserveState: true }),
        );

        await user.click(screen.getByRole('combobox', { name: 'Période' }));
        await user.click(
            await screen.findByRole('option', { name: 'Depuis le début' }),
        );
        expect(get).toHaveBeenLastCalledWith(
            '/tools/activity?period=all',
            {},
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('paginates with Précédent and Suivant keeping the filters', async () => {
        const user = userEvent.setup({
            advanceTimers: vi.advanceTimersByTime,
        });
        render(
            <ActivityIndex
                {...props}
                activities={makeActivityPage({
                    current_page: 2,
                    last_page: 3,
                    total: 120,
                    prev_page_url: '/tools/activity?page=1',
                    next_page_url: '/tools/activity?page=3',
                })}
                filters={{
                    period: 'month',
                    member: null,
                    resource: 'leads',
                    lead: null,
                }}
            />,
        );

        expect(
            screen.getByRole('navigation', { name: 'Pagination' }),
        ).toHaveTextContent('Page 2 sur 3');
        expect(screen.getByText('120 entrées')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Page 3' }));
        expect(get).toHaveBeenCalledWith(
            '/tools/activity?period=month&resource=leads&page=3',
            {},
            expect.objectContaining({ preserveState: true }),
        );

        await user.click(screen.getByRole('button', { name: 'Page 1' }));
        expect(get).toHaveBeenLastCalledWith(
            '/tools/activity?period=month&resource=leads',
            {},
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('declares its breadcrumbs', () => {
        expect(ActivityIndex.layout.breadcrumbs.map((b) => b.title)).toEqual([
            'Outils',
            "Journal d'activité",
        ]);
        expect(ActivityIndex.layout.breadcrumbs[1]?.href.url).toBe(
            '/tools/activity',
        );
    });
});
