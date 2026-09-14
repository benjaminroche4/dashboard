import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { readStored, useStoredState } from '@/hooks/use-stored-state';

describe('useStoredState', () => {
    it('starts from the initial value and remembers every change', () => {
        const { result, unmount } = renderHook(() =>
            useStoredState<string[]>('test.filters', []),
        );

        expect(result.current[0]).toEqual([]);

        act(() => result.current[1](['urgent']));
        act(() => result.current[1]((current) => [...current, 'high']));

        expect(result.current[0]).toEqual(['urgent', 'high']);
        expect(localStorage.getItem('dashboard.test.filters')).toBe(
            JSON.stringify(['urgent', 'high']),
        );

        // Un nouveau montage — un rechargement de la page — retrouve la valeur.
        unmount();
        const again = renderHook(() =>
            useStoredState<string[]>('test.filters', []),
        );
        expect(again.result.current[0]).toEqual(['urgent', 'high']);
    });

    it('is a plain state without a key', () => {
        const { result } = renderHook(() =>
            useStoredState<boolean>(undefined, false),
        );

        act(() => result.current[1](true));

        expect(result.current[0]).toBe(true);
        expect(localStorage.length).toBe(0);
    });

    it('falls back to the initial value when the storage is unreadable', () => {
        localStorage.setItem('dashboard.test.broken', '{not json');
        expect(readStored('test.broken', 'fallback')).toBe('fallback');

        // Stockage qui refuse d'écrire (navigation privée) : rien ne casse.
        const setItem = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });
        const { result } = renderHook(() =>
            useStoredState<number>('test.quota', 0),
        );
        act(() => result.current[1](3));
        expect(result.current[0]).toBe(3);
        setItem.mockRestore();
    });
});
