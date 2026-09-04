import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    members: [] as { id: number; name: string }[],
    listener: null as null | ((event: unknown) => void),
}));

vi.mock('@/hooks/use-online-staff', () => ({
    useOnlineStaff: () => state.members,
}));
vi.mock('@/hooks/use-staff-channel', () => ({
    describeEvent: (event: { actor: { name: string }; message: string }) =>
        `${event.actor.name} ${event.message}`,
    useStaffChannel: ({ onEvent }: { onEvent: (event: unknown) => void }) => {
        state.listener = onEvent;
    },
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Admin' } },
            staff: [
                { id: 1, name: 'Admin', role: 'admin' },
                { id: 2, name: 'Admin Deux', role: 'admin' },
                { id: 3, name: 'Claire Dubois', role: 'manager' },
            ],
        },
    }),
}));

import { InfoSidebar } from '@/components/info-sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

function renderSidebar(open = true, onOpenChange = vi.fn()) {
    render(
        <TooltipProvider>
            <InfoSidebar open={open} onOpenChange={onOpenChange} />
        </TooltipProvider>,
    );

    return onOpenChange;
}

describe('InfoSidebar', () => {
    beforeEach(() => {
        state.members = [];
        state.listener = null;
    });

    it('lists every staff member with their live status, online first', () => {
        state.members = [{ id: 3, name: 'Claire Dubois' }];
        renderSidebar();

        const rows = screen
            .getAllByRole('listitem')
            .filter((li) => li.hasAttribute('data-online'));

        expect(rows).toHaveLength(3);
        expect(rows[0]).toHaveTextContent('Claire Dubois');
        expect(rows[0]).toHaveTextContent('Manager');
        expect(rows[0].querySelector('[aria-label="En ligne"]')).not.toBeNull();
        expect(
            rows[1].querySelector('[aria-label="Hors ligne"]'),
        ).not.toBeNull();
        expect(screen.getByText('1 / 3 en ligne')).toBeInTheDocument();
        expect(screen.getByText('(vous)')).toBeInTheDocument();
    });

    it('shows empty states and the shortcuts', () => {
        renderSidebar();

        expect(screen.getByText('0 / 3 en ligne')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Les actions des autres membres apparaîtront ici.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('Rechercher une page')).toBeInTheDocument();
    });

    it('appends live events to the activity feed, newest first', () => {
        renderSidebar();

        act(() => {
            state.listener?.({
                resource: 'orders',
                payload: {},
                message: 'a expédié la commande #1',
                actor: { id: 2, name: 'Admin 2' },
                at: '2026-09-04T10:00:00Z',
            });
            state.listener?.({
                resource: 'users',
                payload: {},
                message: 'a créé un membre',
                actor: { id: 3, name: 'Claire' },
                at: '2026-09-04T10:05:00Z',
            });
        });

        const items = screen
            .getAllByRole('listitem')
            .map((li) => li.textContent);
        expect(
            items.some((text) => text?.startsWith('Claire a créé un membre')),
        ).toBe(true);
        expect(
            items.findIndex((text) => text?.startsWith('Claire')),
        ).toBeLessThan(items.findIndex((text) => text?.startsWith('Admin 2')));
    });

    it('closes from the sheet close button', async () => {
        const user = userEvent.setup();
        const onOpenChange = renderSidebar();

        await user.click(screen.getByRole('button', { name: /close/i }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});

describe('InfoSidebar as a sheet', () => {
    it('renders nothing while closed and a dialog when open', () => {
        renderSidebar(false);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens as a right-side dialog', () => {
        renderSidebar(true);
        expect(
            screen.getByRole('dialog', { name: 'Informations' }),
        ).toHaveClass('right-0');
    });
});
