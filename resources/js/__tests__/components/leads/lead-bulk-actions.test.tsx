import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadBulkActions } from '@/components/leads/lead-bulk-actions';
import { leadStatuses, lossReasons, makeLead } from '@/test/fixtures/lead';

const patch = vi.fn();

vi.mock('@inertiajs/react', () => ({
    router: { patch: (...args: unknown[]) => patch(...args) },
}));

const leads = [
    makeLead({ id: 1, name: 'Léa Durand' }),
    makeLead({ id: 2, name: 'Marc Petit' }),
];

describe('LeadBulkActions', () => {
    beforeEach(() => {
        patch.mockReset();
        patch.mockImplementation(
            (
                _url: string,
                _data: unknown,
                options: { onSuccess?: () => void; onFinish?: () => void },
            ) => {
                options.onSuccess?.();
                options.onFinish?.();
            },
        );
    });

    it('moves every checked lead to the chosen status in one request', async () => {
        const user = userEvent.setup();
        const onDone = vi.fn();
        render(
            <LeadBulkActions
                leads={leads}
                statuses={leadStatuses}
                lossReasons={lossReasons}
                onDone={onDone}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Statut \(2\)/ }));
        await user.click(
            await screen.findByRole('menuitem', { name: 'En cours' }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/locataires/bulk-status',
            { ids: [1, 2], status: 'in_progress' },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(onDone).toHaveBeenCalled();
    });

    it('asks one loss reason for the whole group before archiving', async () => {
        const user = userEvent.setup();
        render(
            <LeadBulkActions
                leads={leads}
                statuses={leadStatuses}
                lossReasons={lossReasons}
                onDone={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Statut \(2\)/ }));
        await user.click(
            await screen.findByRole('menuitem', { name: 'Archivé' }),
        );

        // Rien ne part avant le motif : une seule modale pour les deux leads.
        expect(patch).not.toHaveBeenCalled();
        const dialog = await screen.findByRole('dialog', {
            name: 'Archiver 2 leads',
        });
        expect(dialog).toHaveTextContent('Le même motif sera posé sur chacun');
        await user.click(
            screen.getByRole('radio', { name: lossReasons[0].label }),
        );
        await user.type(screen.getByLabelText(/Précision/), 'Budget à 800 €');
        await user.click(screen.getByRole('button', { name: 'Archiver' }));

        expect(patch).toHaveBeenCalledWith(
            '/locataires/bulk-status',
            {
                ids: [1, 2],
                status: 'archived',
                loss_reason: lossReasons[0].value,
                loss_note: 'Budget à 800 €',
            },
            expect.anything(),
        );
    });
});
