import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { FavoriteButton } from '@/components/favorite-button';

describe('FavoriteButton', () => {
    beforeEach(() => {
        post.mockReset();
    });

    it('toggles the star immediately and posts to the toggle route', async () => {
        const user = userEvent.setup();
        render(
            <FavoriteButton
                favorite={false}
                url="/real-estate/agents/abc/favorite"
                name="Zoé Martin"
            />,
        );

        const button = screen.getByRole('button', {
            name: 'Ajouter Zoé Martin aux favoris',
        });
        expect(button).toHaveAttribute('aria-pressed', 'false');

        await user.click(button);
        expect(post).toHaveBeenCalledWith(
            '/real-estate/agents/abc/favorite',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.getByRole('button', {
                name: 'Retirer Zoé Martin des favoris',
            }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('reverts the star when the request fails', async () => {
        const user = userEvent.setup();
        post.mockImplementation(
            (_url: string, _data: unknown, options: { onError: () => void }) =>
                options.onError(),
        );
        render(
            <FavoriteButton
                favorite={true}
                url="/real-estate/agencies/abc/favorite"
                name="Agence du Marais"
            />,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Retirer Agence du Marais des favoris',
            }),
        );
        expect(
            screen.getByRole('button', {
                name: 'Retirer Agence du Marais des favoris',
            }),
        ).toHaveAttribute('aria-pressed', 'true');
    });
});
