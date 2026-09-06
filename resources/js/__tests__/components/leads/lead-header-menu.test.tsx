import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch, destroy } = vi.hoisted(() => ({
    patch: vi.fn(),
    destroy: vi.fn(),
}));
vi.mock('@inertiajs/react', () => ({ router: { patch, delete: destroy } }));

import { LeadHeaderMenu } from '@/components/leads/lead-header-menu';
import { lossReasons, makeLeadDetail } from '@/test/fixtures/lead';

describe('LeadHeaderMenu', () => {
    it('archives after confirmation and hides deletion for non-admins', async () => {
        const user = userEvent.setup();
        render(
            <LeadHeaderMenu
                lead={makeLeadDetail()}
                canDelete={false}
                lossReasons={lossReasons}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Supprimer le lead' }),
        ).not.toBeInTheDocument();
        await user.click(
            await screen.findByRole('menuitem', { name: 'Archiver le lead' }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        await user.click(dialog.getByRole('radio', { name: 'Parti ailleurs' }));
        await user.click(dialog.getByRole('button', { name: 'Archiver' }));

        expect(patch).toHaveBeenCalledWith(
            '/leads/1/status',
            {
                status: 'archived',
                loss_reason: 'went_elsewhere',
                loss_note: '',
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('deletes after confirmation for admins', async () => {
        const user = userEvent.setup();
        render(
            <LeadHeaderMenu
                lead={makeLeadDetail()}
                canDelete
                lossReasons={lossReasons}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Supprimer le lead' }),
        );
        await user.click(
            within(await screen.findByRole('dialog')).getByRole('button', {
                name: 'Supprimer le lead',
            }),
        );

        expect(destroy).toHaveBeenCalledWith('/leads/1', expect.anything());
    });
});
