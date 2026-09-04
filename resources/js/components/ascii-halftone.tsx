import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    src: string;
    alt?: string;
    className?: string;
    /** Largeur d'une cellule en pixels CSS (la hauteur découle du ratio). */
    cellWidth?: number;
    /** Ratio largeur / hauteur d'une cellule monospace. */
    cellRatio?: number;
    /** Rampe de caractères, du plus clair au plus sombre. */
    ramp?: string;
};

export type AsciiHalftoneOptions = {
    width: number;
    height: number;
    cellWidth: number;
    cellRatio: number;
    ramp: string;
};

const FONT_FAMILY =
    '"JetBrains Mono", "SF Mono", Menlo, "Courier New", Courier, monospace';
const CONTRAST_BOOST = 1.2;
const GLYPH_OPACITY = 0.8;
const OVERLAY_OPACITY = 0.25;

function coverRect(
    image: { width: number; height: number },
    width: number,
    height: number,
) {
    const canvasRatio = width / height;
    const imageRatio = image.width / image.height;
    const sw =
        canvasRatio > imageRatio ? image.width : image.height * canvasRatio;
    const sh =
        canvasRatio > imageRatio ? image.width / canvasRatio : image.height;

    return { sx: (image.width - sw) / 2, sy: (image.height - sh) / 2, sw, sh };
}

/**
 * Colored ASCII halftone.
 *
 * 1. La source, contraste +20 %, est réduite à la grille (une couleur moyenne par cellule).
 * 2. Chaque cellule : fond = couleur moyenne (pixelisé, sans lissage),
 *    glyphe noir à 80 % choisi par luminance sur la rampe (clair → sombre).
 * 3. L'image originale est superposée à 25 % en mode multiply pour adoucir la grille.
 */
export function renderAsciiHalftone(
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource & { width: number; height: number },
    options: AsciiHalftoneOptions,
): void {
    const { width, height, cellWidth, cellRatio, ramp } = options;
    const cellHeight = cellWidth / cellRatio;
    const cols = Math.max(1, Math.ceil(width / cellWidth));
    const rows = Math.max(1, Math.ceil(height / cellHeight));

    // 1. Échantillonnage : couleur moyenne par cellule, contraste boosté.
    const sampler = document.createElement('canvas');
    sampler.width = cols;
    sampler.height = rows;
    const sctx = sampler.getContext('2d', { willReadFrequently: true });

    if (!sctx) {
        return;
    }

    const { sx, sy, sw, sh } = coverRect(image, width, height);
    sctx.filter = `contrast(${CONTRAST_BOOST})`;
    sctx.drawImage(image, sx, sy, sw, sh, 0, 0, cols, rows);
    sctx.filter = 'none';
    const { data } = sctx.getImageData(0, 0, cols, rows);

    // 2. Grille : fond pixelisé + glyphe noir.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${cellHeight}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const last = ramp.length - 1;
    const glyphs: { char: string; x: number; y: number }[] = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

            ctx.fillStyle = `rgb(${r} ${g} ${b})`;
            ctx.fillRect(
                Math.floor(x * cellWidth),
                Math.floor(y * cellHeight),
                Math.ceil(cellWidth),
                Math.ceil(cellHeight),
            );

            const char = ramp[Math.round((1 - luma) * last)];

            if (char !== ' ') {
                glyphs.push({
                    char,
                    x: (x + 0.5) * cellWidth,
                    y: (y + 0.5) * cellHeight,
                });
            }
        }
    }

    ctx.fillStyle = `rgb(0 0 0 / ${GLYPH_OPACITY})`;

    for (const glyph of glyphs) {
        ctx.fillText(glyph.char, glyph.x, glyph.y);
    }

    // 3. Image originale en multiply à 25 % pour adoucir la grille.
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = OVERLAY_OPACITY;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

/**
 * Image hero en colored ASCII halftone (canvas 2D, statique).
 * Sans canvas ou avant le chargement, l'image brute est affichée.
 */
export default function AsciiHalftone({
    src,
    alt = '',
    className,
    cellWidth = 8,
    cellRatio = 0.6,
    ramp = ' .:1TX#',
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

        const draw = () => {
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

            renderAsciiHalftone(ctx, image, {
                width,
                height,
                cellWidth: cellWidth * dpr,
                cellRatio,
                ramp,
            });
            setReady(true);
        };

        const observer = new ResizeObserver(draw);
        observer.observe(canvas);

        const loader = new Image();
        loader.crossOrigin = 'anonymous';
        loader.onload = () => {
            image = loader;
            draw();
        };
        loader.src = src;

        return () => {
            disposed = true;
            observer.disconnect();
        };
    }, [src, cellWidth, cellRatio, ramp]);

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
