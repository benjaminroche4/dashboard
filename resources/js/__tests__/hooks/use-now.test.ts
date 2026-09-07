import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from '@/hooks/use-now';

describe('useNow', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("rafraîchit l'heure à chaque intervalle et arrête le minuteur au démontage", () => {
        const clear = vi.spyOn(window, 'clearInterval');
        const { result, unmount } = renderHook(() => useNow());

        expect(result.current.toISOString()).toBe('2026-09-10T12:00:00.000Z');

        act(() => {
            vi.advanceTimersByTime(2_000);
        });

        expect(result.current.toISOString()).toBe('2026-09-10T12:00:02.000Z');

        unmount();
        expect(clear).toHaveBeenCalled();
    });
});
