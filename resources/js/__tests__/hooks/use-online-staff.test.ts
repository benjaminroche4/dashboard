import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Member = { id: number; name: string };
type Callbacks = {
    here?: (m: Member[]) => void;
    joining?: (m: Member) => void;
    leaving?: (m: Member) => void;
};

const state = vi.hoisted(() => ({
    callbacks: {} as Callbacks,
    presence: null as unknown,
}));

vi.mock('@laravel/echo-react', () => ({
    usePresenceChannel: () => ({ channel: () => state.presence }),
}));

import { useOnlineStaff } from '@/hooks/use-online-staff';

function fakePresence() {
    const presence = {
        here(cb: Callbacks['here']) {
            state.callbacks.here = cb;
            return presence;
        },
        joining(cb: Callbacks['joining']) {
            state.callbacks.joining = cb;
            return presence;
        },
        leaving(cb: Callbacks['leaving']) {
            state.callbacks.leaving = cb;
            return presence;
        },
    };

    return presence;
}

describe('useOnlineStaff', () => {
    beforeEach(() => {
        state.callbacks = {};
        state.presence = fakePresence();
    });

    it('starts empty and fills with the members already here', () => {
        const { result } = renderHook(() => useOnlineStaff());

        expect(result.current).toEqual([]);

        act(() => state.callbacks.here?.([{ id: 1, name: 'Admin' }]));

        expect(result.current).toEqual([{ id: 1, name: 'Admin' }]);
    });

    it('adds joining members once and removes leaving ones', () => {
        const { result } = renderHook(() => useOnlineStaff());

        act(() => state.callbacks.here?.([{ id: 1, name: 'Admin' }]));
        act(() => state.callbacks.joining?.({ id: 2, name: 'Admin 2' }));
        act(() => state.callbacks.joining?.({ id: 2, name: 'Admin 2' }));

        expect(result.current).toHaveLength(2);

        act(() => state.callbacks.leaving?.({ id: 1, name: 'Admin' }));

        expect(result.current).toEqual([{ id: 2, name: 'Admin 2' }]);
    });

    it('stays empty when the channel is not ready', () => {
        state.presence = null;

        const { result } = renderHook(() => useOnlineStaff());

        expect(result.current).toEqual([]);
    });
});
