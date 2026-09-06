import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeadArchiveDialog } from '@/components/leads/lead-archive-dialog';
import { lossReasons } from '@/test/fixtures/lead';

describe('LeadArchiveDialog', () => {
    it('requires a reason, accepts a note and confirms', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(
            <LeadArchiveDialog
                leadName="Léa Durand"
                reasons={lossReasons}
                open
                onOpenChange={vi.fn()}
                onConfirm={onConfirm}
            />,
        );

        expect(
            screen.getByRole('dialog', { name: 'Archiver Léa Durand' }),
        ).toBeInTheDocument();
        const confirm = screen.getByRole('button', { name: 'Archiver' });
        expect(confirm).toBeDisabled();

        await user.click(screen.getByRole('radio', { name: 'Trop cher' }));
        await user.type(
            screen.getByLabelText('Précision (facultatif)'),
            'Budget à 900 €.',
        );
        await user.click(confirm);

        expect(onConfirm).toHaveBeenCalledWith({
            reason: 'too_expensive',
            note: 'Budget à 900 €.',
        });
    });
});
