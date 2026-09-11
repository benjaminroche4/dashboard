import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { patch } }));

import { LeadStatusMenu } from '@/components/leads/lead-status-menu';
import { leadStatuses, lossReasons, makeLead } from '@/test/fixtures/lead';

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
            await screen.findByRole('menuitem', { name: /En cours/ }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/status',
            { status: 'in_progress' },
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
            await screen.findByRole('menuitem', { name: /À traiter/ }),
        );

        expect(patch).not.toHaveBeenCalled();
    });

    it('asks for a loss reason before archiving', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        render(
            <LeadStatusMenu
                lead={makeLead()}
                statuses={leadStatuses}
                lossReasons={lossReasons}
            />,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Changer le statut de Léa Durand',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: /Archivé/ }),
        );

        expect(patch).not.toHaveBeenCalled();
        await user.click(await screen.findByRole('radio', { name: 'Autre' }));
        await user.click(screen.getByRole('button', { name: 'Archiver' }));

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/status',
            { status: 'archived', loss_reason: 'other', loss_note: '' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
