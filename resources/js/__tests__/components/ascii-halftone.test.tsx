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

    function makeCtx() {
        const log: string[] = [];
        const ctx = {
            log,
            fillStyle: '',
            font: '',
            filter: '',
            textAlign: '',
            textBaseline: '',
            imageSmoothingEnabled: true,
            globalAlpha: 1,
            globalCompositeOperation: 'source-over',
            clearRect: vi.fn(),
            fillRect: vi.fn(function (this: { fillStyle: string }) {
                log.push(`rect:${this.fillStyle}`);
            }),
            fillText: vi.fn(function (
                this: { fillStyle: string },
                char: string,
            ) {
                log.push(`text:${char}:${this.fillStyle}`);
            }),
            drawImage: vi.fn(
                function (this: {
                    globalAlpha: number;
                    globalCompositeOperation: string;
                }) {
                    log.push(
                        `image:${this.globalCompositeOperation}:${this.globalAlpha}`,
                    );
                },
            ),
        };

        return ctx;
    }

    it('paints each cell with its colour, a black glyph by luminance, then the multiply overlay', () => {
        // Grille 2x1 : une cellule blanche (glyphe vide), une cellule très sombre (glyphe dense).
        const pixels = new Uint8ClampedArray([
            255, 255, 255, 255, 30, 20, 10, 255,
        ]);
        const sampler = {
            filter: '',
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

        const ctx = makeCtx();

        renderAsciiHalftone(
            ctx as unknown as CanvasRenderingContext2D,
            { width: 200, height: 100 } as HTMLImageElement,
            {
                width: 16,
                height: 13,
                cellWidth: 8,
                cellRatio: 0.6,
                ramp: ' .:1TX#',
            },
        );

        // Contraste +20 % appliqué à l'échantillonnage, puis retiré.
        expect(sampler.drawImage).toHaveBeenCalledTimes(1);
        expect(sampler.getImageData).toHaveBeenCalledWith(0, 0, 2, 1);

        // Police = hauteur de cellule (8 / 0.6), sans lissage pour la grille.
        expect(ctx.font).toMatch(/^13\.33\d*px /);
        expect(ctx.log).toEqual([
            'rect:rgb(255 255 255)',
            'rect:rgb(30 20 10)',
            'text:X:rgb(0 0 0 / 0.8)',
            'image:multiply:0.25',
        ]);

        // État du contexte rétabli après le rendu.
        expect(ctx.globalAlpha).toBe(1);
        expect(ctx.globalCompositeOperation).toBe('source-over');
        expect(ctx.imageSmoothingEnabled).toBe(true);
    });
});
