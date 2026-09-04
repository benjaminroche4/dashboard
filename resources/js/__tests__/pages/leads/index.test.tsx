import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { patch },
}));

import LeadsIndex from '@/pages/leads/index';
import { leadStatuses, makeLead } from '@/test/fixtures/lead';

const leads = [
    makeLead(),
    makeLead({
        id: 2,
        name: 'Marc Petit',
        status: 'converted',
        status_label: 'Converti',
    }),
    makeLead({
        id: 3,
        name: 'Nina Roy',
        status: 'archived',
        status_label: 'Archivé',
        budget_cents: null,
    }),
];

describe('Leads kanban page', () => {
    it('shows one column per status with its cards and the Converting Machine button', () => {
        render(<LeadsIndex leads={leads} statuses={leadStatuses} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Leads',
        );
        expect(
            screen.getByText('3 lead(s) · 1 en cours · 1 converti(s)'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Converting Machine' }),
        ).toHaveAttribute('href', '/leads/create');

        const columns = screen.getAllByRole('listitem', {
            name: /À traiter|En cours|Devis envoyé|Converti|Archivé/,
        });
        expect(columns).toHaveLength(5);
        expect(
            within(
                screen.getByRole('listitem', { name: 'À traiter' }),
            ).getByText('Léa Durand'),
        ).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('listitem', { name: 'Converti' }),
            ).getByText('Marc Petit'),
        ).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('listitem', { name: 'En cours' }),
            ).getByText('Déposez un lead ici'),
        ).toBeInTheDocument();
    });

    it('filters cards by name', async () => {
        const user = userEvent.setup();
        render(<LeadsIndex leads={leads} statuses={leadStatuses} />);

        await user.type(screen.getByLabelText('Filtrer les leads'), 'nina');

        expect(screen.getByText('Nina Roy')).toBeInTheDocument();
        expect(screen.queryByText('Léa Durand')).not.toBeInTheDocument();
    });

    it('moves a card to another column on drop and patches its status', () => {
        patch.mockClear();
        render(<LeadsIndex leads={leads} statuses={leadStatuses} />);

        const card = screen.getByRole('article', { name: 'Léa Durand' });
        const target = screen.getByRole('listitem', { name: 'Devis envoyé' });
        const store: Record<string, string> = {};
        const dataTransfer = {
            setData: (type: string, value: string) => {
                store[type] = value;
            },
            getData: (type: string) => store[type] ?? '',
            effectAllowed: 'all',
            dropEffect: 'none',
        };

        fireEvent.dragStart(card, { dataTransfer });
        fireEvent.dragOver(target, { dataTransfer });
        fireEvent.drop(target, { dataTransfer });

        expect(within(target).getByText('Léa Durand')).toBeInTheDocument();
        expect(patch).toHaveBeenCalledWith(
            '/leads/1/status',
            { status: 'quote_sent' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
