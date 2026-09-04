import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { visit } = vi.hoisted(() => ({ visit: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { visit } }));

import { SearchCommand } from '@/components/search-command';

describe('SearchCommand', () => {
    it('renders a search field with the ⌘K hint', () => {
        render(<SearchCommand />);

        expect(
            screen.getByRole('button', { name: 'Rechercher' }),
        ).toHaveTextContent('Rechercher…');
        expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('opens the palette on click and navigates on select', async () => {
        const user = userEvent.setup();
        render(<SearchCommand />);

        await user.click(screen.getByRole('button', { name: 'Rechercher' }));

        expect(
            await screen.findByPlaceholderText('Rechercher une page…'),
        ).toBeInTheDocument();
        expect(screen.getByText('Sécurité')).toBeInTheDocument();

        await user.click(screen.getByText('Sécurité'));

        expect(visit).toHaveBeenCalledWith('/settings/security');
    });

    it('toggles with ⌘K', async () => {
        const user = userEvent.setup();
        render(<SearchCommand />);

        await user.keyboard('{Meta>}k{/Meta}');

        expect(
            await screen.findByPlaceholderText('Rechercher une page…'),
        ).toBeInTheDocument();
    });
});
