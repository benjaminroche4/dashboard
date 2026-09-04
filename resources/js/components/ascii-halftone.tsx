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
    /** Couleur de fond derrière les caractères. */
    background?: string;
};

const FONT_FAMILY =
    'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/**
 * Convertit une image en trame ASCII : chaque cellule reçoit un caractère
 * choisi selon sa luminance et conserve sa couleur moyenne.
 */
export function renderAsciiHalftone(
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource & { width: number; height: number },
    options: {
        width: number;
        height: number;
        cellSize: number;
        charset: string;
        background: string;
    },
): void {
    const { width, height, cellSize, charset, background } = options;
    const cols = Math.max(1, Math.floor(width / cellSize));
    const rows = Math.max(1, Math.floor(height / cellSize));

    // Échantillonnage : l'image est réduite à la grille, en mode "cover".
    const sampler = document.createElement('canvas');
    sampler.width = cols;
    sampler.height = rows;
    const sctx = sampler.getContext('2d', { willReadFrequently: true });

    if (!sctx) {
        return;
    }

    const canvasRatio = width / height;
    const imageRatio = image.width / image.height;
    const sw =
        canvasRatio > imageRatio ? image.width : image.height * canvasRatio;
    const sh =
        canvasRatio > imageRatio ? image.width / canvasRatio : image.height;
    const sx = (image.width - sw) / 2;
    const sy = (image.height - sh) / 2;

    sctx.drawImage(image, sx, sy, sw, sh, 0, 0, cols, rows);
    const { data } = sctx.getImageData(0, 0, cols, rows);

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.font = `${cellSize}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const last = charset.length - 1;
    const offsetX = (width - cols * cellSize) / 2 + cellSize / 2;
    const offsetY = (height - rows * cellSize) / 2 + cellSize / 2;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            const char = charset[Math.round(luma * last)];

            if (char === ' ') {
                continue;
            }

            ctx.fillStyle = `rgb(${r} ${g} ${b})`;
            ctx.fillText(char, offsetX + x * cellSize, offsetY + y * cellSize);
        }
    }
}

/**
 * Image hero rendue en ASCII halftone (canvas 2D, statique).
 * Sans canvas ou avant le chargement, l'image brute est affichée.
 */
export default function AsciiHalftone({
    src,
    alt = '',
    className,
    cellSize = 9,
    charset = ' .:-=+*#%@',
    background = '#0a0a0a',
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
                cellSize: cellSize * dpr,
                charset,
                background,
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
    }, [src, cellSize, charset, background]);

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
