import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom does not implement ResizeObserver, which Radix UI (shadcn) relies on.
class ResizeObserverStub {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

// Défini directement (et non via stubGlobal) : un `vi.unstubAllGlobals()` dans un test ne doit pas l'enlever.
Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserverStub,
});

// jsdom n'implémente pas scrollIntoView (utilisé par cmdk).
Element.prototype.scrollIntoView = vi.fn();

// jsdom n'implémente pas matchMedia (utilisé pour prefers-reduced-motion).
Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

afterEach(() => {
    cleanup();
});

// Radix Select : jsdom n'implémente pas la capture de pointeur.
for (const method of [
    'hasPointerCapture',
    'setPointerCapture',
    'releasePointerCapture',
] as const) {
    if (!(method in Element.prototype)) {
        Object.defineProperty(Element.prototype, method, {
            configurable: true,
            value: vi.fn(() => false),
        });
    }
}

// input-otp (saisie du code d'appairage) interroge document.elementFromPoint, absent de jsdom.
if (typeof document.elementFromPoint !== 'function') {
    document.elementFromPoint = () => null;
}
