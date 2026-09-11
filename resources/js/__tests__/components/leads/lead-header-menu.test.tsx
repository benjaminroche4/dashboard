import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch, destroy, post, visit } = vi.hoisted(() => ({
    patch: vi.fn(),
    destroy: vi.fn(),
    post: vi.fn(),
    visit: vi.fn(),
}));
vi.mock('@inertiajs/react', () => ({
    router: { patch, delete: destroy, post, visit },
}));
const { success } = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock('@/lib/toast', () => ({ notify: { success } }));

import { LeadHeaderMenu } from '@/components/leads/lead-header-menu';
import { lossReasons, makeLeadDetail } from '@/test/fixtures/lead';

describe('LeadHeaderMenu', () => {
    it('moves a tenant lead to the owner leads', async () => {
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
        await user.click(
            await screen.findByRole('menuitem', {
                name: 'Déplacer vers « Leads propriétaires »',
            }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/segment',
            { segment: 'owner' },
            expect.objectContaining({ preserveScroll: true }),
        );
        // Le toast de confirmation est posé par le serveur.
        patch.mockReset();
    });

    it('adds an owner lead to the directory, then links to its page', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <LeadHeaderMenu
                lead={makeLeadDetail({ segment: 'owner' })}
                canDelete={false}
                lossReasons={lossReasons}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        await user.click(
            await screen.findByRole('menuitem', {
                name: 'Ajouter à l’annuaire des propriétaires',
            }),
        );
        expect(post).toHaveBeenCalledWith(
            '/owners/from-lead/0199a9a0-0000-7000-8000-000000000001',
            {},
            expect.anything(),
        );

        // Une fois la fiche créée, l'entrée y mène au lieu de la recréer.
        rerender(
            <LeadHeaderMenu
                lead={makeLeadDetail({ segment: 'owner' })}
                canDelete={false}
                lossReasons={lossReasons}
                directoryOwner={{ uuid: 'owner-1', name: 'Zoé Martin' }}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        await user.click(
            await screen.findByRole('menuitem', {
                name: 'Voir la fiche de l’annuaire',
            }),
        );
        expect(visit).toHaveBeenCalledWith('/owners/owner-1');
    });

    it('offers no directory entry for a tenant lead', async () => {
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
            await screen.findByRole('menuitem', { name: /Déplacer vers/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: /annuaire/ }),
        ).not.toBeInTheDocument();
    });

    it('offers the way back for an owner lead', async () => {
        const user = userEvent.setup();
        render(
            <LeadHeaderMenu
                lead={makeLeadDetail({ segment: 'owner' })}
                canDelete={false}
                lossReasons={lossReasons}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        expect(
            await screen.findByRole('menuitem', {
                name: 'Déplacer vers « Tous les leads »',
            }),
        ).toBeInTheDocument();
    });

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
        await user.click(
            dialog.getByRole('radio', { name: 'Mauvais closing' }),
        );
        await user.click(dialog.getByRole('button', { name: 'Archiver' }));

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/status',
            {
                status: 'archived',
                loss_reason: 'bad_closing',
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

        expect(destroy).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001',
            expect.anything(),
        );
    });
});
