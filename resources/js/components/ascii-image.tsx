import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    src: string;
    alt?: string;
    className?: string;
    /** Taille d'une cellule ASCII en pixels CSS. */
    cellSize?: number;
    /** Caractères du plus sombre au plus clair. */
    charset?: string;
    /** Opacité de la photo en filigrane sous la trame (0 = papier blanc, 1 = photo brute). */
    photoOpacity?: number;
};

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_glyphs;
uniform vec2 u_resolution;
uniform vec2 u_imageSize;
uniform float u_cell;
uniform float u_glyphCount;
uniform float u_time;
uniform float u_photoOpacity;
varying vec2 v_uv;

// Coordonnées "cover" : l'image remplit la surface sans déformation.
vec2 coverUv(vec2 uv) {
    float canvasRatio = u_resolution.x / u_resolution.y;
    float imageRatio = u_imageSize.x / u_imageSize.y;
    vec2 scale = canvasRatio > imageRatio
        ? vec2(1.0, imageRatio / canvasRatio)
        : vec2(canvasRatio / imageRatio, 1.0);
    return (uv - 0.5) * scale + 0.5;
}

void main() {
    vec2 grid = u_resolution / u_cell;
    vec2 cell = floor(v_uv * grid);
    vec2 cellUv = fract(v_uv * grid);

    vec2 sampleUv = coverUv((cell + 0.5) / grid);
    sampleUv.y = 1.0 - sampleUv.y;
    vec3 color = texture2D(u_image, sampleUv).rgb;
    float luma = dot(color, vec3(0.299, 0.587, 0.114));

    // Léger scintillement pour donner vie à la trame.
    float flicker = 0.04 * sin(u_time * 2.0 + cell.x * 0.7 + cell.y * 1.3);
    // Sur fond clair, les zones sombres reçoivent les glyphes les plus denses.
    float darkness = pow(clamp(1.0 - luma + flicker, 0.0, 1.0), 1.15);
    float index = floor(clamp(darkness, 0.0, 0.999) * u_glyphCount);

    vec2 glyphUv = vec2((index + cellUv.x) / u_glyphCount, 1.0 - cellUv.y);
    float ink = texture2D(u_glyphs, glyphUv).a;

    // Rendu clair en deux couches : la photo en filigrane (lissée, sans trame)
    // pour garder la lecture de l'image, puis les glyphes colorés par-dessus.
    vec2 photoUv = coverUv(v_uv);
    photoUv.y = 1.0 - photoUv.y;
    vec3 photo = texture2D(u_image, photoUv).rgb;
    vec3 paper = mix(vec3(1.0), photo, u_photoOpacity);

    vec3 ink_color = mix(color * 0.8, vec3(0.2), 0.3);
    gl_FragColor = vec4(mix(paper, ink_color, ink * 0.9), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);

    if (!shader) {
        return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function buildGlyphAtlas(charset: string, size: number): HTMLCanvasElement {
    const atlas = document.createElement('canvas');
    atlas.width = size * charset.length;
    atlas.height = size;

    const ctx = atlas.getContext('2d');

    if (ctx) {
        ctx.clearRect(0, 0, atlas.width, atlas.height);
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.round(size * 0.95)}px ui-monospace, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < charset.length; i++) {
            ctx.fillText(charset[i], size * i + size / 2, size / 2 + 1);
        }
    }

    return atlas;
}

/**
 * Affiche une image rendue en ASCII art par un shader WebGL.
 * Sans WebGL (ou avant le chargement), l'image brute est affichée.
 */
export default function AsciiImage({
    src,
    alt = '',
    className,
    cellSize = 10,
    charset = ' .:-=+*#%@',
    photoOpacity = 0.35,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas?.getContext('webgl', {
            antialias: false,
            premultipliedAlpha: false,
        });

        if (!canvas || !gl) {
            return;
        }

        const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        const program = gl.createProgram();

        if (!vertex || !fragment || !program) {
            return;
        }

        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.useProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW,
        );
        const position = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        const uniforms = {
            image: gl.getUniformLocation(program, 'u_image'),
            glyphs: gl.getUniformLocation(program, 'u_glyphs'),
            resolution: gl.getUniformLocation(program, 'u_resolution'),
            imageSize: gl.getUniformLocation(program, 'u_imageSize'),
            cell: gl.getUniformLocation(program, 'u_cell'),
            glyphCount: gl.getUniformLocation(program, 'u_glyphCount'),
            time: gl.getUniformLocation(program, 'u_time'),
            photoOpacity: gl.getUniformLocation(program, 'u_photoOpacity'),
        };

        const createTexture = (
            unit: number,
            source: TexImageSource,
        ): WebGLTexture | null => {
            const texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_S,
                gl.CLAMP_TO_EDGE,
            );
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_T,
                gl.CLAMP_TO_EDGE,
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                source,
            );

            return texture;
        };

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const glyphTexture = createTexture(
            1,
            buildGlyphAtlas(charset, Math.round(cellSize * dpr * 2)),
        );
        gl.uniform1i(uniforms.glyphs, 1);
        gl.uniform1f(uniforms.glyphCount, charset.length);
        gl.uniform1f(uniforms.cell, cellSize * dpr);
        gl.uniform1f(uniforms.photoOpacity, photoOpacity);

        let imageTexture: WebGLTexture | null = null;
        let frame = 0;
        let disposed = false;
        const start = performance.now();

        const resize = () => {
            const width = Math.round(canvas.clientWidth * dpr);
            const height = Math.round(canvas.clientHeight * dpr);

            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            gl.viewport(0, 0, width, height);
            gl.uniform2f(uniforms.resolution, width, height);
        };

        const render = () => {
            if (disposed) {
                return;
            }

            resize();
            gl.uniform1f(uniforms.time, (performance.now() - start) / 1000);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            frame = requestAnimationFrame(render);
        };

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            if (disposed) {
                return;
            }

            imageTexture = createTexture(0, image);
            gl.uniform1i(uniforms.image, 0);
            gl.uniform2f(uniforms.imageSize, image.width, image.height);
            setReady(true);
            render();
        };
        image.src = src;

        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            gl.deleteTexture(glyphTexture);
            gl.deleteTexture(imageTexture);
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
        };
    }, [src, cellSize, charset, photoOpacity]);

    return (
        <div
            className={cn('relative overflow-hidden bg-neutral-950', className)}
        >
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
