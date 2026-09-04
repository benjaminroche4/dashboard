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

    it('draws the photo, maps darkness to characters and lightens the ink', () => {
        // Grille 2x1 : une cellule blanche (vide), une cellule sombre (dense).
        const pixels = new Uint8ClampedArray([
            255, 255, 255, 255, 40, 20, 10, 255,
        ]);
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

        const clearRect = vi.fn();
        const drawImage = vi.fn();
        const fillText = vi.fn();
        const ctx = {
            clearRect,
            drawImage,
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
                inkOpacity: 0.5,
            },
        );

        // La photo est dessinée intacte, la cellule blanche (espace) est ignorée,
        // la cellule sombre reçoit le glyphe dense dans une encre éclaircie.
        expect(clearRect).toHaveBeenCalledWith(0, 0, 20, 10);
        expect(drawImage).toHaveBeenCalledTimes(1);
        expect(fillText).toHaveBeenCalledTimes(1);
        expect(fillText).toHaveBeenCalledWith('#', 15, 5);
        expect(ctx.fillStyle).toBe('rgb(169 161 157 / 0.5)');
        expect(sampler.getImageData).toHaveBeenCalledWith(0, 0, 2, 1);
    });
});
