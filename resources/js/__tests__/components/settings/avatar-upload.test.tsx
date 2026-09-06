import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, destroy } = vi.hoisted(() => ({
    post: vi.fn(),
    destroy: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { post, delete: destroy },
}));

import { AvatarUpload } from '@/components/settings/avatar-upload';
import { makeUser } from '@/test/fixtures/user';

const png = (size = 10) =>
    new File([new Uint8Array(size)], 'me.png', { type: 'image/png' });

describe('AvatarUpload', () => {
    beforeEach(() => {
        post.mockReset();
        destroy.mockReset();
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: vi.fn(() => 'blob:preview'),
            revokeObjectURL: vi.fn(),
        });
    });

    it('shows the initials and an add button without a photo', () => {
        render(<AvatarUpload user={makeUser({ name: 'Ana Silva' })} />);

        expect(screen.getByText('AS')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Ajouter une photo' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Retirer' }),
        ).not.toBeInTheDocument();
    });

    it('uploads the chosen file as multipart form data', () => {
        render(<AvatarUpload user={makeUser()} />);

        const file = png();
        fireEvent.change(screen.getByLabelText('Choisir une photo de profil'), {
            target: { files: [file] },
        });

        expect(post).toHaveBeenCalledWith(
            '/settings/profile/avatar',
            { avatar: file },
            expect.objectContaining({ forceFormData: true }),
        );
    });

    it('refuses a file above 2 MB without calling the server', () => {
        render(<AvatarUpload user={makeUser()} />);

        fireEvent.change(screen.getByLabelText('Choisir une photo de profil'), {
            target: { files: [png(3 * 1024 * 1024)] },
        });

        expect(post).not.toHaveBeenCalled();
        expect(
            screen.getByText('La photo ne doit pas dépasser 2 Mo.'),
        ).toBeInTheDocument();
    });

    it('offers to change or remove an existing photo', async () => {
        const user = userEvent.setup();
        render(
            <AvatarUpload
                user={makeUser({ avatar: 'http://localhost/storage/me.png' })}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Changer la photo' }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Retirer' }));

        expect(destroy).toHaveBeenCalledWith(
            '/settings/profile/avatar',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows the server error', () => {
        render(
            <AvatarUpload user={makeUser()} error="Le fichier est invalide." />,
        );

        expect(
            screen.getByText('Le fichier est invalide.'),
        ).toBeInTheDocument();
    });
});
