import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    src: string;
    alt?: string;
    className?: string;
    /** Taille d'une cellule (un caractère) en pixels CSS. */
    cellSize?: number;
    /** Caractères du plus clair (peu d'encre) au plus dense. */
    charset?: string;
    /** Opacité des caractères (0 à 1). */
    inkOpacity?: number;
    /** Anime la trame (ondulation + balayage). Désactivé si prefers-reduced-motion. */
    animate?: boolean;
};

export type AsciiCell = {
    x: number;
    y: number;
    darkness: number;
    ink: string;
};

export type AsciiGrid = {
    cols: number;
    rows: number;
    cells: AsciiCell[];
    offsetX: number;
    offsetY: number;
};

const FONT_FAMILY =
    'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

type CoverRect = { sx: number; sy: number; sw: number; sh: number };

function coverRect(
    image: { width: number; height: number },
    width: number,
    height: number,
): CoverRect {
    const canvasRatio = width / height;
    const imageRatio = image.width / image.height;
    const sw =
        canvasRatio > imageRatio ? image.width : image.height * canvasRatio;
    const sh =
        canvasRatio > imageRatio ? image.width / canvasRatio : image.height;

    return { sx: (image.width - sw) / 2, sy: (image.height - sh) / 2, sw, sh };
}

/**
 * Échantillonne la photo sur la grille : une luminance et une encre par cellule.
 * L'encre est la couleur de la cellule tirée vers le blanc, jamais plus sombre.
 */
export function sampleAsciiGrid(
    image: CanvasImageSource & { width: number; height: number },
    options: { width: number; height: number; cellSize: number },
): AsciiGrid | null {
    const { width, height, cellSize } = options;
    const cols = Math.max(1, Math.floor(width / cellSize));
    const rows = Math.max(1, Math.floor(height / cellSize));

    const sampler = document.createElement('canvas');
    sampler.width = cols;
    sampler.height = rows;
    const sctx = sampler.getContext('2d', { willReadFrequently: true });

    if (!sctx) {
        return null;
    }

    const { sx, sy, sw, sh } = coverRect(image, width, height);
    sctx.drawImage(image, sx, sy, sw, sh, 0, 0, cols, rows);
    const { data } = sctx.getImageData(0, 0, cols, rows);

    const cells: AsciiCell[] = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            // Encre claire : en soft-light, elle révèle la lumière de la cellule.
            const lr = Math.round(r + (255 - r) * 0.75);
            const lg = Math.round(g + (255 - g) * 0.75);
            const lb = Math.round(b + (255 - b) * 0.75);

            cells.push({
                x,
                y,
                darkness: 1 - luma,
                ink: `${lr} ${lg} ${lb}`,
            });
        }
    }

    return {
        cols,
        rows,
        cells,
        offsetX: (width - cols * cellSize) / 2 + cellSize / 2,
        offsetY: (height - rows * cellSize) / 2 + cellSize / 2,
    };
}

/**
 * Dessine une frame : la photo intacte, puis la trame ASCII par-dessus.
 * `time` (secondes) anime l'ondulation et le balayage ; 0 = rendu statique.
 */
export function drawAsciiFrame(
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource & { width: number; height: number },
    grid: AsciiGrid,
    options: {
        width: number;
        height: number;
        cellSize: number;
        charset: string;
        inkOpacity: number;
        time?: number;
        amplitude?: number;
    },
): void {
    const {
        width,
        height,
        cellSize,
        charset,
        inkOpacity,
        time = 0,
        amplitude = 0,
    } = options;
    const { sx, sy, sw, sh } = coverRect(image, width, height);

    ctx.clearRect(0, 0, width, height);

    // Base : la photo légèrement adoucie, les glyphes vont lui rendre son détail.
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = `blur(${Math.max(1, cellSize * 0.18)}px)`;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
    ctx.filter = 'none';

    // Glyphes fusionnés en lumière douce : ils éclaircissent la photo là où ils
    // passent, sans jamais la recouvrir ni l'assombrir.
    ctx.globalCompositeOperation = 'soft-light';
    ctx.font = `${cellSize}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const last = charset.length - 1;
    // Balayage lumineux : une bande qui descend en boucle (période 6 s).
    const sweepRow = ((time / 6) % 1) * (grid.rows + 12) - 6;

    for (const cell of grid.cells) {
        // Ondulation : la densité respire en vague à travers la grille.
        const wave =
            amplitude * Math.sin(time * 1.4 + cell.x * 0.35 + cell.y * 0.22);
        const level = Math.min(1, Math.max(0, cell.darkness + wave));
        const char = charset[Math.round(level * last)];

        if (char === ' ') {
            continue;
        }

        const sweep =
            amplitude > 0
                ? Math.max(0, 1 - Math.abs(cell.y - sweepRow) / 6) * 0.35
                : 0;
        const alpha = Math.min(1, inkOpacity + sweep);

        ctx.fillStyle = `rgb(${cell.ink} / ${alpha})`;
        ctx.fillText(
            char,
            grid.offsetX + cell.x * cellSize,
            grid.offsetY + cell.y * cellSize,
        );
    }

    ctx.globalCompositeOperation = 'source-over';
}

/**
 * Rendu statique en une passe (échantillonnage + frame).
 */
export function renderAsciiHalftone(
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource & { width: number; height: number },
    options: {
        width: number;
        height: number;
        cellSize: number;
        charset: string;
        inkOpacity: number;
    },
): void {
    const grid = sampleAsciiGrid(image, options);

    if (grid) {
        drawAsciiFrame(ctx, image, grid, options);
    }
}

/**
 * Photo hero avec trame ASCII superposée et animée (canvas 2D).
 * Sans canvas ou avant le chargement, l'image brute est affichée.
 */
export default function AsciiHalftone({
    src,
    alt = '',
    className,
    cellSize = 9,
    charset = ' .:-=+*#%@',
    inkOpacity = 0.9,
    animate = true,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx) {
            return;
        }

        let disposed = false;
        let image: HTMLImageElement | null = null;
        let grid: AsciiGrid | null = null;
        let size = { width: 0, height: 0, cell: cellSize };
        let frame = 0;
        let lastFrameAt = 0;
        const start = performance.now();

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        const animated = animate && !reducedMotion;
        const amplitude = animated ? 0.16 : 0;

        const drawFrame = (time: number) => {
            if (!image || !grid) {
                return;
            }

            drawAsciiFrame(ctx, image, grid, {
                width: size.width,
                height: size.height,
                cellSize: size.cell,
                charset,
                inkOpacity,
                time,
                amplitude,
            });
        };

        // Recalcule la grille quand la taille change, puis redessine.
        const layout = () => {
            if (!image || disposed) {
                return;
            }

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.round(canvas.clientWidth * dpr);
            const height = Math.round(canvas.clientHeight * dpr);

            if (width === 0 || height === 0) {
                return;
            }

            canvas.width = width;
            canvas.height = height;
            size = { width, height, cell: cellSize * dpr };
            grid = sampleAsciiGrid(image, {
                width,
                height,
                cellSize: size.cell,
            });
            drawFrame(0);
            setReady(true);
        };

        // Boucle limitée à ~24 images par seconde : la trame n'a pas besoin de plus.
        const loop = (now: number) => {
            if (disposed) {
                return;
            }

            if (now - lastFrameAt >= 1000 / 24) {
                lastFrameAt = now;
                drawFrame((now - start) / 1000);
            }

            frame = requestAnimationFrame(loop);
        };

        const observer = new ResizeObserver(layout);
        observer.observe(canvas);

        const loader = new Image();
        loader.crossOrigin = 'anonymous';
        loader.onload = () => {
            image = loader;
            layout();

            if (animated) {
                frame = requestAnimationFrame(loop);
            }
        };
        loader.src = src;

        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [src, cellSize, charset, inkOpacity, animate]);

    return (
        <div className={cn('relative overflow-hidden', className)}>
            <img
                src={src}
                alt={alt}
                className={cn(
                    'size-full object-cover transition-opacity duration-700',
                    ready && 'opacity-0',
                )}
            />
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                className={cn(
                    'absolute inset-0 size-full transition-opacity duration-700',
                    !ready && 'opacity-0',
                )}
            />
        </div>
    );
}
