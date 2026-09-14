import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTLE_MS, useSettle } from '@/hooks/use-settle';

describe('useSettle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('stays quiet on mount, settles for a moment when the value changes', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useSettle(value),
            {
                initialProps: { value: 'Planifier une visite' },
            },
        );

        // Le premier rendu n'est pas un changement.
        expect(result.current).toBe(false);

        rerender({ value: 'Rédiger le compte rendu' });
        expect(result.current).toBe(true);

        act(() => {
            vi.advanceTimersByTime(SETTLE_MS);
        });
        expect(result.current).toBe(false);

        // La même valeur ne fait rien.
        rerender({ value: 'Rédiger le compte rendu' });
        expect(result.current).toBe(false);
    });
});
