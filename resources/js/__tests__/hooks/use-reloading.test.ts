import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = () => void;
const listeners: Record<string, Listener[]> = {};

vi.mock('@inertiajs/react', () => ({
    router: {
        on: (event: string, listener: Listener) => {
            (listeners[event] ??= []).push(listener);

            return () => {
                listeners[event] = (listeners[event] ?? []).filter(
                    (l) => l !== listener,
                );
            };
        },
    },
}));

import { RELOADING_DELAY_MS, useReloading } from '@/hooks/use-reloading';

const fire = (event: string) => listeners[event]?.forEach((l) => l());

describe('useReloading', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('veils only a visit that lasts, and lifts the veil when it finishes', () => {
        const { result, unmount } = renderHook(() => useReloading());

        // Une visite rapide ne fait pas clignoter.
        act(() => {
            fire('start');
        });
        act(() => {
            vi.advanceTimersByTime(RELOADING_DELAY_MS - 1);
        });
        expect(result.current).toBe(false);
        act(() => {
            fire('finish');
        });
        expect(result.current).toBe(false);

        // Une visite longue voile, puis le voile se lève.
        act(() => {
            fire('start');
        });
        act(() => {
            vi.advanceTimersByTime(RELOADING_DELAY_MS);
        });
        expect(result.current).toBe(true);
        act(() => {
            fire('finish');
        });
        expect(result.current).toBe(false);

        unmount();
        expect(listeners.start?.length ?? 0).toBe(0);
    });
});
