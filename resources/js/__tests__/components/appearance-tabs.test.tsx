import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { updateAppearance } = vi.hoisted(() => ({ updateAppearance: vi.fn() }));

vi.mock('@/hooks/use-appearance', () => ({
    useAppearance: () => ({
        appearance: 'dark',
        resolvedAppearance: 'dark',
        updateAppearance,
    }),
}));

import AppearanceTabs from '@/components/appearance-tabs';

describe('AppearanceTabs', () => {
    it('renders the choices as a radio group with the current one checked', () => {
        render(<AppearanceTabs />);

        expect(
            screen.getByRole('radiogroup', { name: 'Thème' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Sombre' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Clair' })).not.toBeChecked();
    });

    it('updates the appearance when a choice is clicked', async () => {
        render(<AppearanceTabs />);

        await userEvent.click(screen.getByRole('radio', { name: 'Système' }));

        expect(updateAppearance).toHaveBeenCalledWith('system');
    });
});
