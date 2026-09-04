import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AsciiHalftone, {
    drawAsciiFrame,
    renderAsciiHalftone,
    type AsciiGrid,
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
        const composites: string[] = [];
        const ctx = {
            clearRect,
            drawImage,
            fillText,
            fillStyle: '',
            font: '',
            filter: '',
            textAlign: '',
            textBaseline: '',
            set globalCompositeOperation(value: string) {
                composites.push(value);
            },
            get globalCompositeOperation() {
                return composites.at(-1) ?? 'source-over';
            },
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
        // La fusion se fait en lumière douce, puis le mode normal est rétabli.
        expect(composites).toContain('soft-light');
        expect(ctx.globalCompositeOperation).toBe('source-over');
        expect(fillText).toHaveBeenCalledWith('#', 15, 5);
        expect(ctx.fillStyle).toBe('rgb(201 196 194 / 0.5)');
        expect(sampler.getImageData).toHaveBeenCalledWith(0, 0, 2, 1);
    });
});

describe('drawAsciiFrame', () => {
    const grid: AsciiGrid = {
        cols: 1,
        rows: 1,
        cells: [{ x: 0, y: 0, darkness: 0.5, ink: '200 200 200' }],
        offsetX: 5,
        offsetY: 5,
    };
    const image = { width: 10, height: 10 } as HTMLImageElement;

    function makeCtx() {
        return {
            clearRect: vi.fn(),
            drawImage: vi.fn(),
            fillText: vi.fn(),
            fillStyle: '',
            font: '',
            textAlign: '',
            textBaseline: '',
        };
    }

    it('is static when the amplitude is zero', () => {
        const ctx = makeCtx();
        const options = {
            width: 10,
            height: 10,
            cellSize: 10,
            charset: ' .:#',
            inkOpacity: 0.5,
            amplitude: 0,
        };

        drawAsciiFrame(
            ctx as unknown as CanvasRenderingContext2D,
            image,
            grid,
            options,
        );
        const first = ctx.fillStyle;
        drawAsciiFrame(
            ctx as unknown as CanvasRenderingContext2D,
            image,
            grid,
            { ...options, time: 3 },
        );

        expect(ctx.fillStyle).toBe(first);
        expect(ctx.fillStyle).toBe('rgb(200 200 200 / 0.5)');
    });

    it('brightens the ink when the sweep passes over the cell', () => {
        const ctx = makeCtx();
        const options = {
            width: 10,
            height: 10,
            cellSize: 10,
            charset: ' .:#',
            inkOpacity: 0.5,
            amplitude: 0.28,
        };

        // À t = 3,5 s × (10 / 21), la bande de balayage est exactement sur la ligne 0.
        drawAsciiFrame(
            ctx as unknown as CanvasRenderingContext2D,
            image,
            grid,
            { ...options, time: (3.5 * 10) / 21 },
        );

        const alpha = Number(/\/ ([\d.]+)\)/.exec(ctx.fillStyle)?.[1]);
        expect(alpha).toBeGreaterThanOrEqual(0.9);
    });
});
