import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { features, loadGoogleMaps } = vi.hoisted(() => ({
    features: { googleMapsKey: 'browser-key' as string | null },
    loadGoogleMaps: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { features } }),
}));
vi.mock('@/lib/google-maps', () => ({ loadGoogleMaps }));

import { AgenciesMapButton } from '@/components/real-estate/agencies-map-dialog';

const agencies = [
    {
        uuid: 'a1',
        name: 'Agence du Marais',
        street: '12 rue de Turenne',
        postal_code: '75003',
        city: 'Paris',
        latitude: 48.86,
        longitude: 2.36,
        phone: '+33 1 42 00 00 00',
        agents_count: 2,
        url: '/real-estate/agencies/a1',
    },
    {
        uuid: 'a2',
        name: 'Bureau Paris Ouest',
        street: '5 avenue Mozart',
        postal_code: '75016',
        city: 'Paris',
        latitude: 48.85,
        longitude: 2.27,
        phone: null,
        agents_count: 0,
        url: '/real-estate/agencies/a2',
    },
];

/** Un Google Maps minimal : de quoi compter les pastilles posées. */
function fakeMaps() {
    const markers: unknown[] = [];
    const maps = {
        Map: vi.fn(function () {
            return { setCenter: vi.fn(), setZoom: vi.fn(), fitBounds: vi.fn() };
        }),
        Marker: vi.fn(function (options: unknown) {
            markers.push(options);
            return { addListener: vi.fn() };
        }),
        InfoWindow: vi.fn(function () {
            return { setContent: vi.fn(), open: vi.fn() };
        }),
        LatLngBounds: vi.fn(function () {
            return { extend: vi.fn(), getCenter: vi.fn() };
        }),
        SymbolPath: { CIRCLE: 0 },
    };

    return { maps, markers };
}

describe('AgenciesMapButton', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        loadGoogleMaps.mockReset();
        features.googleMapsKey = 'browser-key';
    });

    it('loads every geocoded agency once and drops one pin per agency', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(agencies),
        });
        vi.stubGlobal('fetch', fetchMock);
        const { maps, markers } = fakeMaps();
        loadGoogleMaps.mockResolvedValue(maps);

        render(<AgenciesMapButton />);
        await user.click(
            screen.getByRole('button', { name: 'Voir sur la carte' }),
        );

        expect(
            await screen.findByText(
                '2 agence(s) située(s) · cliquez une pastille pour ouvrir sa fiche.',
            ),
        ).toBeInTheDocument();
        await waitFor(() => expect(markers).toHaveLength(2));
        expect(fetchMock).toHaveBeenCalledWith(
            '/real-estate/agencies/map',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(loadGoogleMaps).toHaveBeenCalledWith('browser-key');
        expect(
            screen.getByRole('application', { name: 'Carte des agences' }),
        ).toBeInTheDocument();
    });

    it('explains itself without a browser key, instead of an empty frame', async () => {
        const user = userEvent.setup();
        features.googleMapsKey = null;
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(agencies),
            }),
        );

        render(<AgenciesMapButton />);
        await user.click(
            screen.getByRole('button', { name: 'Voir sur la carte' }),
        );

        expect(await screen.findByText(/clé Google Maps/)).toBeInTheDocument();
        expect(loadGoogleMaps).not.toHaveBeenCalled();
    });
});
