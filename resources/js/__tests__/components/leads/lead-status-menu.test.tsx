import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { patch } }));

import { LeadStatusMenu } from '@/components/leads/lead-status-menu';
import { leadStatuses, makeLead } from '@/test/fixtures/lead';

describe('LeadStatusMenu', () => {
    it('patches the new status when another one is picked', async () => {
        const user = userEvent.setup();
        render(<LeadStatusMenu lead={makeLead()} statuses={leadStatuses} />);

        await user.click(
            screen.getByRole('button', {
                name: 'Changer le statut de Léa Durand',
            }),
        );
        await user.click(
            await screen.findByRole('menuitemradio', { name: 'Contacté' }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/leads/1/status',
            { status: 'contacted' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('does nothing when the current status is re-selected', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        render(<LeadStatusMenu lead={makeLead()} statuses={leadStatuses} />);

        await user.click(
            screen.getByRole('button', {
                name: 'Changer le statut de Léa Durand',
            }),
        );
        await user.click(
            await screen.findByRole('menuitemradio', { name: 'Nouveau' }),
        );

        expect(patch).not.toHaveBeenCalled();
    });
});
