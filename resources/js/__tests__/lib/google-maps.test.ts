import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('loadGoogleMaps', () => {
    beforeEach(() => {
        vi.resetModules();
        document.head.innerHTML = '';
        Reflect.deleteProperty(globalThis, 'google');
    });

    it('injects the script once and resolves when Google calls back', async () => {
        const { loadGoogleMaps } = await import('@/lib/google-maps');

        const first = loadGoogleMaps('k');
        const second = loadGoogleMaps('k');
        const script = document.head.querySelector('script');

        expect(script?.src).toContain('maps.googleapis.com/maps/api/js?key=k');
        expect(script?.src).toContain('loading=async');
        expect(script?.src).toContain('libraries=marker');
        expect(script?.src).toContain('callback=__dashboardGoogleMapsReady');
        expect(document.head.querySelectorAll('script')).toHaveLength(1);

        Object.defineProperty(globalThis, 'google', {
            configurable: true,
            value: { maps: { Map: class {} } },
        });
        const ready = (
            window as Window & { __dashboardGoogleMapsReady?: () => void }
        ).__dashboardGoogleMapsReady;
        expect(ready).toBeTypeOf('function');
        ready?.();

        await expect(first).resolves.toBe(google.maps);
        await expect(second).resolves.toBe(google.maps);
        expect(
            (window as Window & { __dashboardGoogleMapsReady?: unknown })
                .__dashboardGoogleMapsReady,
        ).toBeUndefined();
    });

    it('rejects when the script cannot load', async () => {
        const { loadGoogleMaps } = await import('@/lib/google-maps');

        const pending = loadGoogleMaps('k');
        document.head.querySelector('script')?.onerror?.(new Event('error'));

        await expect(pending).rejects.toThrow('Google Maps');
    });
});
