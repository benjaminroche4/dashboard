import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    src: string;
    alt?: string;
    className?: string;
    /** Taille d'une tuile en pixels CSS. */
    pixelSize?: number;
    /** Rayon (en pixels CSS) du halo pixelisé autour du curseur. */
    revealRadius?: number;
    /** Durée (s) de la résolution des blocs vers la photo nette au chargement. */
    introDuration?: number;
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
uniform vec2 u_resolution;
uniform vec2 u_imageSize;
uniform float u_pixel;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_mouseActive;
uniform float u_revealRadius;
uniform float u_introDuration;
varying vec2 v_uv;

// Coordonnées "cover" : l'image remplit la surface sans déformation.
vec2 coverUv(vec2 uv) {
    float canvasRatio = u_resolution.x / u_resolution.y;
    float imageRatio = u_imageSize.x / u_imageSize.y;
    vec2 scale = canvasRatio > imageRatio
        ? vec2(1.0, imageRatio / canvasRatio)
        : vec2(canvasRatio / imageRatio, 1.0);
    vec2 result = (uv - 0.5) * scale + 0.5;
    result.y = 1.0 - result.y;
    return result;
}

vec3 sampleImage(vec2 uv) {
    return texture2D(u_image, coverUv(uv)).rgb;
}

void main() {
    vec2 px = v_uv * u_resolution;

    // 1. Résolution au chargement : gros blocs -> photo nette (courbe douce).
    float intro = 1.0 - smoothstep(0.0, 1.0, u_time / u_introDuration);
    float introSize = u_pixel * 2.5 * intro;

    // 2. Survol : pixelisation légère dans un halo autour du curseur.
    vec2 mousePx = u_mouse * u_resolution;
    float dist = distance(px, mousePx);
    float hover = u_mouseActive * (1.0 - smoothstep(u_revealRadius * 0.2, u_revealRadius, dist));
    float hoverSize = u_pixel * hover;

    float size = max(introSize, hoverSize);

    // En dessous de 2 px de bloc, on affiche la photo telle quelle.
    if (size < 2.0) {
        gl_FragColor = vec4(sampleImage(v_uv), 1.0);
        return;
    }

    // Grille alignée sur le centre du canvas : les blocs ne "sautent" pas pendant la transition.
    vec2 centered = px - 0.5 * u_resolution;
    vec2 cell = floor(centered / size);
    vec2 cellCenter = ((cell + 0.5) * size + 0.5 * u_resolution) / u_resolution;

    vec3 mosaic = sampleImage(cellCenter);
    vec3 sharp = sampleImage(v_uv);

    // Fondu progressif entre blocs et photo pour éviter tout effet d'escalier brutal.
    float blend = smoothstep(2.0, 6.0, size);
    gl_FragColor = vec4(mix(sharp, mosaic, blend), 1.0);
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

/**
 * Photo qui se résout de gros blocs de pixels vers l'image nette au chargement,
 * puis se pixelise légèrement autour du curseur au survol (shader WebGL).
 * Sans WebGL (ou avant le chargement), l'image brute est affichée.
 */
export default function PixelImage({
    src,
    alt = '',
    className,
    pixelSize = 28,
    revealRadius = 260,
    introDuration = 2.2,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas?.getContext('webgl', { antialias: false });

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
            resolution: gl.getUniformLocation(program, 'u_resolution'),
            imageSize: gl.getUniformLocation(program, 'u_imageSize'),
            pixel: gl.getUniformLocation(program, 'u_pixel'),
            time: gl.getUniformLocation(program, 'u_time'),
            mouse: gl.getUniformLocation(program, 'u_mouse'),
            mouseActive: gl.getUniformLocation(program, 'u_mouseActive'),
            revealRadius: gl.getUniformLocation(program, 'u_revealRadius'),
            introDuration: gl.getUniformLocation(program, 'u_introDuration'),
        };

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        gl.uniform1f(uniforms.pixel, pixelSize * dpr);
        gl.uniform1f(uniforms.revealRadius, revealRadius * dpr);
        gl.uniform1f(uniforms.introDuration, introDuration);

        // Position du curseur lissée pour un halo qui suit avec inertie.
        const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, active: 0 };
        let mouseActiveTarget = 0;

        const onMove = (event: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.targetX = (event.clientX - rect.left) / rect.width;
            mouse.targetY = 1 - (event.clientY - rect.top) / rect.height;
            mouseActiveTarget = 1;
        };
        const onLeave = () => {
            mouseActiveTarget = 0;
        };

        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerleave', onLeave);

        let texture: WebGLTexture | null = null;
        let frame = 0;
        let disposed = false;
        let start = performance.now();

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

            mouse.x += (mouse.targetX - mouse.x) * 0.12;
            mouse.y += (mouse.targetY - mouse.y) * 0.12;
            mouse.active += (mouseActiveTarget - mouse.active) * 0.08;

            resize();
            gl.uniform1f(uniforms.time, (performance.now() - start) / 1000);
            gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
            gl.uniform1f(uniforms.mouseActive, mouse.active);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            frame = requestAnimationFrame(render);
        };

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            if (disposed) {
                return;
            }

            texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
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
                gl.RGB,
                gl.RGB,
                gl.UNSIGNED_BYTE,
                image,
            );
            gl.uniform1i(uniforms.image, 0);
            gl.uniform2f(uniforms.imageSize, image.width, image.height);
            setReady(true);
            start = performance.now();
            render();
        };
        image.src = src;

        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerleave', onLeave);
            gl.deleteTexture(texture);
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
        };
    }, [src, pixelSize, revealRadius, introDuration]);

    return (
        <div
            className={cn('relative overflow-hidden bg-neutral-100', className)}
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
