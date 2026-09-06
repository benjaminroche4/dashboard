import { beforeEach, describe, expect, it, vi } from 'vitest';

const { on, flushAll } = vi.hoisted(() => ({
    on: vi.fn(),
    flushAll: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ router: { on, flushAll } }));

import {
    flushPrefetchCache,
    flushPrefetchOnMutations,
} from '@/lib/prefetch-cache';

describe('prefetch cache', () => {
    beforeEach(() => {
        on.mockReset();
        flushAll.mockReset();
    });

    it('flushes the cache on demand', () => {
        flushPrefetchCache();

        expect(flushAll).toHaveBeenCalledOnce();
    });

    it('flushes before every non-GET visit only', () => {
        flushPrefetchOnMutations();

        expect(on).toHaveBeenCalledWith('before', expect.any(Function));
        const handler = on.mock.calls[0]?.[1] as (event: {
            detail: { visit: { method: string } };
        }) => void;

        handler({ detail: { visit: { method: 'get' } } });
        expect(flushAll).not.toHaveBeenCalled();

        handler({ detail: { visit: { method: 'post' } } });
        handler({ detail: { visit: { method: 'DELETE' } } });
        expect(flushAll).toHaveBeenCalledTimes(2);
    });
});
