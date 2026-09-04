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

afterEach(() => {
    cleanup();
});
