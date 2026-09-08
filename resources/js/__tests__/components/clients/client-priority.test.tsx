import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { patch } }));

import {
    ClientPriorityBadge,
    ClientPriorityMenu,
} from '@/components/clients/client-priority';
import { clientPriorities } from '@/test/fixtures/client';

describe('ClientPriorityBadge', () => {
    it('hides a normal priority unless asked, and names the others', () => {
        const { rerender } = render(
            <ClientPriorityBadge priority="normal" label="Normale" />,
        );
        expect(screen.queryByText('Normale')).not.toBeInTheDocument();

        rerender(
            <ClientPriorityBadge
                priority="normal"
                label="Normale"
                showNormal
            />,
        );
        expect(screen.getByLabelText('Priorité : Normale')).toBeInTheDocument();

        rerender(<ClientPriorityBadge priority="urgent" label="Urgente" />);
        expect(screen.getByLabelText('Priorité : Urgente')).toHaveTextContent(
            'Urgente',
        );
    });
});

describe('ClientPriorityMenu', () => {
    beforeEach(() => patch.mockReset());

    it('shows the current priority and patches the chosen one', async () => {
        const user = userEvent.setup();
        render(
            <ClientPriorityMenu
                uuid="abc"
                priority="normal"
                priorities={clientPriorities}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Priorité : Normale' }),
        );
        const current = await screen.findByRole('menuitemradio', {
            name: 'Normale',
        });
        expect(current).toHaveAttribute('aria-checked', 'true');

        await user.click(
            screen.getByRole('menuitemradio', { name: 'Urgente' }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/clients/abc/priority',
            { priority: 'urgent' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('does nothing when the current priority is picked again', async () => {
        const user = userEvent.setup();
        render(
            <ClientPriorityMenu
                uuid="abc"
                priority="high"
                priorities={clientPriorities}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Priorité : Haute' }),
        );
        await user.click(
            await screen.findByRole('menuitemradio', { name: 'Haute' }),
        );

        expect(patch).not.toHaveBeenCalled();
    });
});
