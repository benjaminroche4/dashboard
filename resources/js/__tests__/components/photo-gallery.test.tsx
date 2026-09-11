import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhotoGallery, stepPhoto } from '@/components/photo-gallery';

const photos = ['/a.jpg', '/b.jpg', '/c.jpg'];

describe('stepPhoto', () => {
    it('walks the photos in a loop, both ways', () => {
        expect(stepPhoto(0, 1, 3)).toBe(1);
        expect(stepPhoto(2, 1, 3)).toBe(0);
        expect(stepPhoto(0, -1, 3)).toBe(2);
        // Une galerie vide ne bouge pas.
        expect(stepPhoto(0, 1, 0)).toBe(0);
    });
});

describe('PhotoGallery', () => {
    it('opens the slideshow on the clicked photo and walks through it', async () => {
        const user = userEvent.setup();
        render(<PhotoGallery photos={photos} label="T2 lumineux · 10e" />);

        // Chaque vignette est un bouton : elle agrandit, elle n'ouvre plus un onglet.
        await user.click(
            screen.getByRole('button', {
                name: 'Agrandir la photo 2 de T2 lumineux · 10e',
            }),
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent('Photo 2 sur 3');

        await user.click(
            screen.getByRole('button', { name: 'Photo suivante' }),
        );
        expect(screen.getByRole('dialog')).toHaveTextContent('Photo 3 sur 3');

        // La suivante de la dernière est la première.
        await user.click(
            screen.getByRole('button', { name: 'Photo suivante' }),
        );
        expect(screen.getByRole('dialog')).toHaveTextContent('Photo 1 sur 3');

        // Les flèches du clavier circulent aussi.
        await user.keyboard('{ArrowLeft}');
        expect(screen.getByRole('dialog')).toHaveTextContent('Photo 3 sur 3');
    });

    it('jumps to a photo from the thumbnail strip', async () => {
        const user = userEvent.setup();
        render(<PhotoGallery photos={photos} label="T2 lumineux · 10e" />);

        await user.click(
            screen.getByRole('button', {
                name: 'Agrandir la photo 1 de T2 lumineux · 10e',
            }),
        );

        const strip = within(screen.getByRole('dialog'));
        const third = strip.getByRole('button', { name: 'Photo 3' });
        expect(strip.getByRole('button', { name: 'Photo 1' })).toHaveAttribute(
            'aria-current',
            'true',
        );

        await user.click(third);
        expect(screen.getByRole('dialog')).toHaveTextContent('Photo 3 sur 3');
        expect(third).toHaveAttribute('aria-current', 'true');
    });

    it('closes the full-screen slideshow from its own button', async () => {
        const user = userEvent.setup();
        render(<PhotoGallery photos={photos} label="Studio" />);

        await user.click(
            screen.getByRole('button', {
                name: 'Agrandir la photo 1 de Studio',
            }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Fermer le diaporama' }),
        );

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('sets a photo as the cover from the star on the tile', async () => {
        const user = userEvent.setup();
        const onSetCover = vi.fn();
        render(
            <PhotoGallery
                photos={photos}
                label="T2 lumineux · 10e"
                onSetCover={onSetCover}
            />,
        );

        // La première est déjà la principale : elle porte l'étoile pleine.
        expect(screen.getByLabelText('Photo principale')).toBeInTheDocument();

        const third = screen.getByRole('button', {
            name: 'Définir la photo 3 comme principale',
        });
        await user.click(third);
        expect(onSetCover).toHaveBeenCalledWith(2);
        // Le clic se voit tout de suite : l'étoile se remplit sans attendre
        // la réponse du serveur, qui seule réordonne les photos.
        expect(third.className).toContain('text-amber-500');
        expect(third.className).toContain('opacity-100');

        // Sans le rappel, aucune étoile : la galerie reste en lecture seule.
        expect(
            screen.queryByRole('button', {
                name: 'Définir la photo 1 comme principale',
            }),
        ).toBeNull();
    });

    it('plays the halo on the tile that just became the cover', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <PhotoGallery photos={photos} label="T2" onSetCover={vi.fn()} />,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Définir la photo 2 comme principale',
            }),
        );

        // Le serveur réordonne : la photo choisie passe en tête et se signale.
        rerender(
            <PhotoGallery
                photos={['/b.jpg', '/a.jpg', '/c.jpg']}
                label="T2"
                onSetCover={vi.fn()}
            />,
        );

        const tiles = screen.getAllByRole('listitem');
        expect(tiles[0]?.className).toContain('animate-photo-cover');
        expect(tiles[1]?.className).not.toContain('animate-photo-cover');
    });

    it('hides the arrows for a lone photo', async () => {
        const user = userEvent.setup();
        render(<PhotoGallery photos={['/a.jpg']} label="Studio" />);

        await user.click(
            screen.getByRole('button', {
                name: 'Agrandir la photo 1 de Studio',
            }),
        );

        expect(
            screen.queryByRole('button', { name: 'Photo suivante' }),
        ).toBeNull();
    });
});
