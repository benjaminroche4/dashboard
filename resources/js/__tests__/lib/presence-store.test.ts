import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    configured: true,
    callbacks: {} as Record<string, (arg: never) => void>,
    join: vi.fn(),
}));

vi.mock('@laravel/echo-react', () => {
    const channel = {
        here(cb: (arg: never) => void) {
            state.callbacks.here = cb;
            return channel;
        },
        joining(cb: (arg: never) => void) {
            state.callbacks.joining = cb;
            return channel;
        },
        leaving(cb: (arg: never) => void) {
            state.callbacks.leaving = cb;
            return channel;
        },
        error(cb: (arg: never) => void) {
            state.callbacks.error = cb;
            return channel;
        },
    };

    return {
        echoIsConfigured: () => state.configured,
        echo: () => ({
            join: (name: string) => {
                state.join(name);
                return channel;
            },
        }),
    };
});

import {
    ensurePresenceJoined,
    getPresenceSnapshot,
    resetPresenceStore,
    subscribePresence,
} from '@/lib/presence-store';

describe('presence store', () => {
    beforeEach(() => {
        resetPresenceStore();
        state.configured = true;
        state.callbacks = {};
        state.join.mockClear();
    });

    it('joins the staff presence channel once', () => {
        ensurePresenceJoined();
        ensurePresenceJoined();

        expect(state.join).toHaveBeenCalledTimes(1);
        expect(state.join).toHaveBeenCalledWith('staff');
    });

    it('does nothing when Echo is not configured', () => {
        state.configured = false;

        ensurePresenceJoined();

        expect(state.join).not.toHaveBeenCalled();
    });

    it('tracks here, joining and leaving and notifies subscribers', () => {
        const listener = vi.fn();
        subscribePresence(listener);
        ensurePresenceJoined();

        (state.callbacks.here as (m: unknown) => void)([
            { id: 1, name: 'Admin' },
        ]);
        (state.callbacks.joining as (m: unknown) => void)({
            id: 2,
            name: 'Admin 2',
        });
        (state.callbacks.joining as (m: unknown) => void)({
            id: 2,
            name: 'Admin 2',
        });

        expect(getPresenceSnapshot()).toEqual([
            { id: 1, name: 'Admin' },
            { id: 2, name: 'Admin 2' },
        ]);

        (state.callbacks.leaving as (m: unknown) => void)({
            id: 1,
            name: 'Admin',
        });

        expect(getPresenceSnapshot()).toEqual([{ id: 2, name: 'Admin 2' }]);
        expect(listener).toHaveBeenCalledTimes(3);
    });

    it('allows a retry after a subscription error', () => {
        ensurePresenceJoined();
        (state.callbacks.error as (e: unknown) => void)(new Error('down'));

        ensurePresenceJoined();

        expect(state.join).toHaveBeenCalledTimes(2);
    });
});
