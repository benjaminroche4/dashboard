import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/toast', () => ({
    notify: { error: vi.fn(), warning: vi.fn() },
}));

import {
    PropertyPhotos,
    type SavedPhoto,
} from '@/components/properties/property-photos';

const saved: SavedPhoto[] = [
    { path: 'properties/salon.jpg', url: '/storage/properties/salon.jpg' },
];

const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

/** Champ caché de la dropzone, seul moyen de déposer un fichier en test. */
const dropzoneInput = () =>
    document.querySelector<HTMLInputElement>('input[type="file"]')!;

describe('PropertyPhotos', () => {
    beforeEach(() => {
        URL.createObjectURL = vi.fn(
            (file: Blob) => `blob:${(file as File).name}`,
        );
        URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows the saved photos and drops one of them', async () => {
        const user = userEvent.setup();
        const onSavedChange = vi.fn();
        render(
            <PropertyPhotos
                saved={saved}
                files={[]}
                onSavedChange={onSavedChange}
                onFilesChange={vi.fn()}
            />,
        );

        // L'image décorative n'a pas de rôle : on la vise par sa source.
        expect(
            document.querySelector('img[src="/storage/properties/salon.jpg"]'),
        ).not.toBeNull();
        await user.click(
            screen.getByRole('button', { name: 'Retirer cette photo' }),
        );
        expect(onSavedChange).toHaveBeenCalledWith([]);
    });

    it('drops new files and shows the invitation of the design', async () => {
        const user = userEvent.setup();
        const onFilesChange = vi.fn();
        render(
            <PropertyPhotos
                saved={[]}
                files={[]}
                onSavedChange={vi.fn()}
                onFilesChange={onFilesChange}
            />,
        );

        const zone = screen.getByRole('button', {
            name: 'Ajouter des photos du bien',
        });
        expect(
            within(zone).getByText(/Choisissez un fichier ou déposez-le ici/),
        ).toBeInTheDocument();
        expect(within(zone).getByText(/JPG, PNG ou WebP/)).toBeInTheDocument();
        expect(within(zone).getByText('Parcourir')).toBeInTheDocument();

        await user.upload(dropzoneInput(), [photo('salon.jpg')]);
        expect(onFilesChange).toHaveBeenCalledWith([
            expect.objectContaining({ name: 'salon.jpg' }),
        ]);
    });

    it('shows a thumbnail of each photo waiting to be sent', async () => {
        const user = userEvent.setup();
        const onFilesChange = vi.fn();
        const file = photo('cuisine.jpg');
        render(
            <PropertyPhotos
                saved={[]}
                files={[file]}
                onSavedChange={vi.fn()}
                onFilesChange={onFilesChange}
            />,
        );

        expect(
            screen.getByAltText('Photo à envoyer : cuisine.jpg'),
        ).toHaveAttribute('src', 'blob:cuisine.jpg');
        await user.click(
            screen.getByRole('button', { name: 'Retirer cuisine.jpg' }),
        );
        expect(onFilesChange).toHaveBeenCalledWith([]);
    });

    it('falls back to the file name when the browser cannot preview it', () => {
        // @ts-expect-error on simule un navigateur sans createObjectURL.
        URL.createObjectURL = undefined;

        render(
            <PropertyPhotos
                saved={[]}
                files={[photo('plan.jpg')]}
                onSavedChange={vi.fn()}
                onFilesChange={vi.fn()}
            />,
        );

        // Pas de vignette : le nom et la taille du fichier prennent la place.
        expect(screen.getByText('plan.jpg')).toBeInTheDocument();
        expect(
            screen.queryByAltText(/^Photo à envoyer/),
        ).not.toBeInTheDocument();
    });

    it('stops at ten photos in all', () => {
        render(
            <PropertyPhotos
                saved={Array.from({ length: 10 }, (_, index) => ({
                    path: `properties/${index}.jpg`,
                    url: `/storage/properties/${index}.jpg`,
                }))}
                files={[]}
                onSavedChange={vi.fn()}
                onFilesChange={vi.fn()}
            />,
        );

        expect(
            screen.getByRole('button', {
                name: 'Ajouter des photos du bien',
            }),
        ).toBeDisabled();
    });
});
