import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reload, useEchoPresence, toastInfo } = vi.hoisted(() => ({
    reload: vi.fn(),
    useEchoPresence: vi.fn(),
    toastInfo: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { reload },
    usePage: () => ({ props: { auth: { user: { id: 1 } } } }),
}));
vi.mock('@laravel/echo-react', () => ({ useEchoPresence }));
vi.mock('@/lib/toast', () => ({ notify: { info: toastInfo } }));

import {
    describeEvent,
    useStaffChannel,
    type DashboardUpdatedEvent,
} from '@/hooks/use-staff-channel';

type Listener = (event: DashboardUpdatedEvent) => void;

const fromOther: DashboardUpdatedEvent = {
    resource: 'orders',
    payload: { id: 1 },
    message: 'a expédié la commande #1',
    actor: { id: 2, name: 'Admin 2' },
    at: '2026-01-01',
};

const fromMe: DashboardUpdatedEvent = {
    ...fromOther,
    actor: { id: 1, name: 'Admin' },
};

function lastListener(): Listener {
    return useEchoPresence.mock.calls.at(-1)?.[2] as Listener;
}

describe('describeEvent', () => {
    it('prefixes the message with the actor name', () => {
        expect(describeEvent(fromOther)).toBe(
            'Admin 2 a expédié la commande #1',
        );
    });

    it('returns the bare message without actor', () => {
        expect(describeEvent({ ...fromOther, actor: null })).toBe(
            'a expédié la commande #1',
        );
    });
});

describe('useStaffChannel', () => {
    beforeEach(() => {
        reload.mockClear();
        useEchoPresence.mockClear();
        toastInfo.mockClear();
    });

    it('subscribes to the staff presence channel for dashboard.updated', () => {
        renderHook(() => useStaffChannel());

        expect(useEchoPresence).toHaveBeenCalledWith(
            'staff',
            '.dashboard.updated',
            expect.any(Function),
            expect.any(Array),
        );
    });

    it('toasts and reloads the whole page for another member’s action', () => {
        renderHook(() => useStaffChannel());

        lastListener()(fromOther);

        expect(toastInfo).toHaveBeenCalledWith(
            'Admin 2 a expédié la commande #1',
        );
        expect(reload).toHaveBeenCalledWith({ only: undefined });
    });

    it('ignores the current user’s own actions', () => {
        const onEvent = vi.fn();
        renderHook(() => useStaffChannel({ onEvent }));

        lastListener()(fromMe);

        expect(toastInfo).not.toHaveBeenCalled();
        expect(onEvent).not.toHaveBeenCalled();
        expect(reload).not.toHaveBeenCalled();
    });

    it('reloads only the requested props', () => {
        renderHook(() => useStaffChannel({ only: ['orders', 'stats'] }));

        lastListener()(fromOther);

        expect(reload).toHaveBeenCalledWith({ only: ['orders', 'stats'] });
    });

    it('can disable the toast and the reload', () => {
        const onEvent = vi.fn();
        renderHook(() =>
            useStaffChannel({ notify: false, reload: false, onEvent }),
        );

        lastListener()(fromOther);

        expect(onEvent).toHaveBeenCalledWith(fromOther);
        expect(toastInfo).not.toHaveBeenCalled();
        expect(reload).not.toHaveBeenCalled();
    });
});
