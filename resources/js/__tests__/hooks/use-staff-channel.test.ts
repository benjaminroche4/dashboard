import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reload, useEchoPresence, toastInfo, toastWarning } = vi.hoisted(() => ({
    reload: vi.fn(),
    useEchoPresence: vi.fn(),
    toastInfo: vi.fn(),
    toastWarning: vi.fn(),
}));

const page = vi.hoisted(() => ({
    realtimeOnly: undefined as string[] | undefined,
}));

vi.mock('@inertiajs/react', () => ({
    router: { reload, flushAll: vi.fn() },
    usePage: () => ({
        props: { auth: { user: { id: 1 } }, realtimeOnly: page.realtimeOnly },
    }),
}));
vi.mock('@laravel/echo-react', () => ({ useEchoPresence }));
vi.mock('@/lib/toast', () => ({
    notify: { info: toastInfo, warning: toastWarning },
}));

import {
    describeEvent,
    mentionsMe,
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

    it('marks the current user’s own actions from another tab', () => {
        expect(describeEvent(fromMe, 1)).toBe(
            'Vous (autre onglet) : a expédié la commande #1',
        );
        expect(describeEvent(fromOther, 1)).toBe(
            'Admin 2 a expédié la commande #1',
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

    it('handles the current user’s own actions coming from another tab', () => {
        const onEvent = vi.fn();
        renderHook(() => useStaffChannel({ onEvent }));

        lastListener()(fromMe);

        expect(toastInfo).toHaveBeenCalledWith(
            'Vous (autre onglet) : a expédié la commande #1',
        );
        expect(onEvent).toHaveBeenCalledWith(fromMe);
        expect(reload).toHaveBeenCalledWith({ only: undefined });
    });

    it('reloads only the requested props', () => {
        renderHook(() => useStaffChannel({ only: ['orders', 'stats'] }));

        lastListener()(fromOther);

        expect(reload).toHaveBeenCalledWith({
            only: ['orders', 'stats', 'counts'],
        });
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

describe('mentions', () => {
    it('detects when the current user is mentioned by someone else', () => {
        const mention: DashboardUpdatedEvent = {
            ...fromOther,
            payload: { id: 1, mentions: [1, 3] },
            message: 'vous a mentionné dans une note sur le lead Léa',
        };

        expect(mentionsMe(mention, 1)).toBe(true);
        expect(mentionsMe(mention, 2)).toBe(false);
        expect(
            mentionsMe({ ...mention, actor: { id: 1, name: 'Admin' } }, 1),
        ).toBe(false);
    });

    it('shows a warning toast instead of the info toast when mentioned', () => {
        useEchoPresence.mockClear();
        toastInfo.mockClear();
        toastWarning.mockClear();
        renderHook(() => useStaffChannel());

        lastListener()({
            ...fromOther,
            payload: { id: 1, mentions: [1] },
            message: 'vous a mentionné dans une note sur le lead Léa',
        });

        expect(toastWarning).toHaveBeenCalledWith(
            'Admin 2 vous a mentionné',
            'vous a mentionné dans une note sur le lead Léa',
        );
        expect(toastInfo).not.toHaveBeenCalled();
    });

    it('reloads only the props the page declares in realtimeOnly', () => {
        reload.mockClear();
        page.realtimeOnly = ['leads'];
        renderHook(() => useStaffChannel());

        lastListener()(fromOther);

        expect(reload).toHaveBeenCalledWith({ only: ['leads', 'counts'] });
        page.realtimeOnly = undefined;
    });
});
