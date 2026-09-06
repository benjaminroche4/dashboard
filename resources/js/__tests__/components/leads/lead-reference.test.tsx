import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeadReference } from '@/components/leads/lead-reference';

describe('LeadReference', () => {
    it('copies the reference and shows a short "Copié" state', async () => {
        const user = userEvent.setup();
        // userEvent.setup() pose son propre presse-papiers : on le remplace après.
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        render(<LeadReference reference="LD-4821" resetAfter={50} />);

        const chip = screen.getByRole('button', {
            name: 'Copier la référence LD-4821',
        });
        expect(chip).not.toHaveAttribute('data-copied');

        await user.click(chip);

        expect(writeText).toHaveBeenCalledWith('LD-4821');
        expect(chip).toHaveAttribute('data-copied', 'true');
        expect(chip).toHaveAccessibleName('Référence copiée');
        expect(chip).toHaveTextContent('Copié');

        await waitFor(() => expect(chip).not.toHaveAttribute('data-copied'));
        expect(chip).toHaveAccessibleName('Copier la référence LD-4821');
    });
});
