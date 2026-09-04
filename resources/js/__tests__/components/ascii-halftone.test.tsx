import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AsciiHalftone, {
    renderAsciiHalftone,
} from '@/components/ascii-halftone';

// jsdom n'a pas de canvas : le composant doit retomber sur l'image brute.
describe('AsciiHalftone', () => {
    it('renders the raw image plus a canvas overlay', () => {
        const { container } = render(
            <AsciiHalftone
                src="/images/login.jpg"
                alt="Paris"
                className="rounded-3xl"
            />,
        );

        const image = container.querySelector('img');
        const canvas = container.querySelector('canvas');

        expect(image).toHaveAttribute('src', '/images/login.jpg');
        expect(image).toHaveAttribute('alt', 'Paris');
        expect(canvas).toHaveAttribute('aria-hidden', 'true');
        expect(container.firstElementChild).toHaveClass(
            'rounded-3xl',
            'overflow-hidden',
        );
    });

    it('keeps the raw image visible while canvas is unavailable', () => {
        const { container } = render(<AsciiHalftone src="/images/login.jpg" />);

        expect(container.querySelector('img')).not.toHaveClass('opacity-0');
        expect(container.querySelector('canvas')).toHaveClass('opacity-0');
    });
});

describe('renderAsciiHalftone', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('maps luminance to characters and keeps each cell colour', () => {
        // Grille 2x1 : une cellule noire, une cellule orange.
        const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 128, 0, 255]);
        const sampler = {
            drawImage: vi.fn(),
            getImageData: vi.fn(() => ({ data: pixels })),
        };
        vi.spyOn(document, 'createElement').mockImplementation(
            () =>
                ({
                    getContext: () => sampler,
                    width: 0,
                    height: 0,
                }) as unknown as HTMLCanvasElement,
        );

        const fillRect = vi.fn();
        const fillText = vi.fn();
        const ctx = {
            fillRect,
            fillText,
            fillStyle: '',
            font: '',
            textAlign: '',
            textBaseline: '',
        } as unknown as CanvasRenderingContext2D;

        renderAsciiHalftone(
            ctx,
            { width: 200, height: 100 } as HTMLImageElement,
            {
                width: 20,
                height: 10,
                cellSize: 10,
                charset: ' .#',
                background: '#000',
            },
        );

        // Le fond est peint, la cellule noire (espace) est ignorée,
        // la cellule orange reçoit un caractère dans sa couleur.
        expect(fillRect).toHaveBeenCalledWith(0, 0, 20, 10);
        expect(fillText).toHaveBeenCalledTimes(1);
        expect(fillText).toHaveBeenCalledWith('.', 15, 5);
        expect(ctx.fillStyle).toBe('rgb(255 128 0)');
        expect(sampler.getImageData).toHaveBeenCalledWith(0, 0, 2, 1);
    });
});
