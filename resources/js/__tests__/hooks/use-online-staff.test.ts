import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
    members: [] as { id: number; name: string }[],
    listeners: new Set<() => void>(),
    ensure: vi.fn(),
}));

vi.mock('@/lib/presence-store', () => ({
    ensurePresenceJoined: store.ensure,
    getPresenceSnapshot: () => store.members,
    subscribePresence: (listener: () => void) => {
        store.listeners.add(listener);
        return () => store.listeners.delete(listener);
    },
}));

import { useOnlineStaff } from '@/hooks/use-online-staff';

function push(members: { id: number; name: string }[]) {
    store.members = members;
    store.listeners.forEach((listener) => listener());
}

describe('useOnlineStaff', () => {
    beforeEach(() => {
        store.members = [];
        store.listeners.clear();
        store.ensure.mockClear();
    });

    it('joins the presence channel on mount', () => {
        renderHook(() => useOnlineStaff());

        expect(store.ensure).toHaveBeenCalledTimes(1);
    });

    it('re-renders when the store changes', () => {
        const { result } = renderHook(() => useOnlineStaff());

        expect(result.current).toEqual([]);

        act(() => push([{ id: 1, name: 'Admin' }]));

        expect(result.current).toEqual([{ id: 1, name: 'Admin' }]);
    });
});
