import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LeadActivitySheet } from '@/components/leads/lead-activity-sheet';

describe('LeadActivitySheet', () => {
    it('opens a side sheet with the count, filters, feed and composer', async () => {
        const user = userEvent.setup();
        render(
            <LeadActivitySheet
                count={3}
                filters={<div>Filtres</div>}
                composer={<textarea aria-label="Nouvelle note" />}
            >
                <p>Rappeler mardi.</p>
            </LeadActivitySheet>,
        );

        expect(screen.queryByText('Rappeler mardi.')).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Voir l’activité' }),
        );

        const dialog = within(screen.getByRole('dialog', { name: 'Activité' }));
        expect(dialog.getByLabelText('3 entrées')).toHaveTextContent('3');
        expect(dialog.getByText('Filtres')).toBeInTheDocument();
        expect(dialog.getByText('Rappeler mardi.')).toBeInTheDocument();
        expect(
            dialog.getByRole('textbox', { name: 'Nouvelle note' }),
        ).toBeInTheDocument();
    });
});
