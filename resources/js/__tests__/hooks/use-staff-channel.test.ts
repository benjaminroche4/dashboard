import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reload, useEchoPresence } = vi.hoisted(() => ({
    reload: vi.fn(),
    useEchoPresence: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ router: { reload } }));
vi.mock('@laravel/echo-react', () => ({ useEchoPresence }));

import { useStaffChannel } from '@/hooks/use-staff-channel';

type Listener = (event: {
    resource: string;
    payload: Record<string, unknown>;
    at: string;
}) => void;

const event = { resource: 'orders', payload: { id: 1 }, at: '2026-01-01' };

function lastListener(): Listener {
    return useEchoPresence.mock.calls.at(-1)?.[2] as Listener;
}

describe('useStaffChannel', () => {
    beforeEach(() => {
        reload.mockClear();
        useEchoPresence.mockClear();
    });

    it('subscribes to the staff presence channel for dashboard.updated', () => {
        renderHook(() => useStaffChannel());

        expect(useEchoPresence).toHaveBeenCalledWith(
            'staff',
            '.dashboard.updated',
            expect.any(Function),
        );
    });

    it('reloads the whole page when no props are specified', () => {
        renderHook(() => useStaffChannel());

        lastListener()(event);

        expect(reload).toHaveBeenCalledWith({ only: undefined });
    });

    it('reloads only the requested props', () => {
        renderHook(() => useStaffChannel(['orders', 'stats']));

        lastListener()(event);

        expect(reload).toHaveBeenCalledWith({ only: ['orders', 'stats'] });
    });

    it('forwards the event to the optional callback before reloading', () => {
        const onEvent = vi.fn();
        renderHook(() => useStaffChannel([], onEvent));

        lastListener()(event);

        expect(onEvent).toHaveBeenCalledWith(event);
        expect(reload).toHaveBeenCalledTimes(1);
    });
});
