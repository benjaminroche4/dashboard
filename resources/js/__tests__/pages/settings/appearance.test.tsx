import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

vi.mock('@/hooks/use-appearance', () => ({
    useAppearance: () => ({
        appearance: 'system',
        resolvedAppearance: 'light',
        updateAppearance: vi.fn(),
    }),
}));

import Appearance from '@/pages/settings/appearance';

describe('Appearance settings page', () => {
    it('shows the theme panel with the three choices', () => {
        render(<Appearance />);

        expect(
            screen.getByRole('region', { name: 'Thème' }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('radio').map((radio) => radio.textContent),
        ).toEqual(['Clair', 'Sombre', 'Système']);
        expect(screen.getByText(/suit le réglage/)).toBeInTheDocument();
    });
});
