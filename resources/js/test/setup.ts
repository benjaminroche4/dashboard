import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom does not implement ResizeObserver, which Radix UI (shadcn) relies on.
class ResizeObserverStub {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// jsdom n'implémente pas scrollIntoView (utilisé par cmdk).
Element.prototype.scrollIntoView = vi.fn();

// jsdom n'implémente pas matchMedia (utilisé pour prefers-reduced-motion).
vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
);

afterEach(() => {
    cleanup();
});
