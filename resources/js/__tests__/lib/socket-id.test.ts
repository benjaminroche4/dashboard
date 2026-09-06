import { beforeEach, describe, expect, it, vi } from 'vitest';

const { on, echo, echoIsConfigured } = vi.hoisted(() => ({
    on: vi.fn(),
    echo: vi.fn(),
    echoIsConfigured: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ router: { on } }));
vi.mock('@laravel/echo-react', () => ({ echo, echoIsConfigured }));

import {
    attachSocketIdToInertia,
    currentSocketId,
    withSocketId,
} from '@/lib/socket-id';

describe('socket id header', () => {
    beforeEach(() => {
        on.mockReset();
        echo.mockReset();
        echoIsConfigured.mockReset();
    });

    it('adds the header only when a socket id exists', () => {
        expect(withSocketId({ Accept: 'x' }, '1234.5678')).toEqual({
            Accept: 'x',
            'X-Socket-ID': '1234.5678',
        });
        expect(withSocketId({ Accept: 'x' }, undefined)).toEqual({
            Accept: 'x',
        });
    });

    it('reads the socket id from Echo, tolerating a missing connection', () => {
        echoIsConfigured.mockReturnValue(false);
        expect(currentSocketId()).toBeUndefined();

        echoIsConfigured.mockReturnValue(true);
        echo.mockReturnValue({ socketId: () => '9.9' });
        expect(currentSocketId()).toBe('9.9');

        echo.mockReturnValue({ socketId: () => undefined });
        expect(currentSocketId()).toBeUndefined();

        echo.mockImplementation(() => {
            throw new Error('not ready');
        });
        expect(currentSocketId()).toBeUndefined();
    });

    it('stamps every Inertia visit before it leaves', () => {
        echoIsConfigured.mockReturnValue(true);
        echo.mockReturnValue({ socketId: () => '1.2' });
        attachSocketIdToInertia();

        expect(on).toHaveBeenCalledWith('before', expect.any(Function));
        const listener = on.mock.calls[0]?.[1] as (event: {
            detail: { visit: { headers: Record<string, string> } };
        }) => void;
        const event = { detail: { visit: { headers: {} } } };
        listener(event);

        expect(event.detail.visit.headers).toEqual({ 'X-Socket-ID': '1.2' });
    });
});
