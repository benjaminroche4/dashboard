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

    it('lists online members with a presence dot', () => {
        state.members = [
            { id: 1, name: 'Admin' },
            { id: 2, name: 'Admin Deux' },
        ];
        renderSidebar();

        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Admin Deux')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows empty states and the shortcuts', () => {
        renderSidebar();

        expect(
            screen.getByText("Personne d'autre pour le moment."),
        ).toBeInTheDocument();
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

    it('closes from its own button', async () => {
        const user = userEvent.setup();
        const onOpenChange = renderSidebar();

        await user.click(
            screen.getByRole('button', { name: 'Fermer le panneau' }),
        );

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});

describe('InfoSidebar layout', () => {
    it('collapses to zero width when closed instead of overlaying', () => {
        renderSidebar(false);
        const aside = screen.getByLabelText("Panneau d'informations", {
            selector: 'aside',
        });

        expect(aside).toHaveClass('w-0');
        expect(aside).toHaveAttribute('data-state', 'closed');
    });
});
