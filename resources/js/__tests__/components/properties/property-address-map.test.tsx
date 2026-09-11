import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pageProps, loadGoogleMaps } = vi.hoisted(() => ({
    pageProps: { features: { googleMapsKey: null as string | null } },
    loadGoogleMaps: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: pageProps }) }));
vi.mock('@/lib/google-maps', () => ({ loadGoogleMaps }));

import { PropertyAddressMap } from '@/components/properties/property-address-map';

/** Google Maps simulé : un géocodeur, une carte et un marqueur observables. */
function fakeMaps(results: unknown[]) {
    const setCenter = vi.fn();
    const setPosition = vi.fn();
    const geocode = vi.fn(() => Promise.resolve({ results }));

    return {
        setCenter,
        setPosition,
        geocode,
        maps: {
            Geocoder: class {
                geocode = geocode;
            },
            Map: class {
                setCenter = setCenter;
            },
            Marker: class {
                setPosition = setPosition;
            },
        },
    };
}

describe('PropertyAddressMap', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.clearAllMocks();
        pageProps.features.googleMapsKey = 'browser-key';
    });

    it('locates the address being typed and centres the map on it', async () => {
        const location = { lat: () => 48.8656, lng: () => 2.3705 };
        const { maps, geocode, setCenter, setPosition } = fakeMaps([
            { geometry: { location } },
        ]);
        loadGoogleMaps.mockResolvedValue(maps);

        render(<PropertyAddressMap address="12 rue Oberkampf, 75011 Paris" />);

        // Rien ne part tant que la frappe n'est pas retombée.
        expect(geocode).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(900);

        await waitFor(() => expect(setCenter).toHaveBeenCalledWith(location));
        expect(setPosition).toHaveBeenCalledWith(location);
        expect(geocode).toHaveBeenCalledWith(
            expect.objectContaining({
                address: '12 rue Oberkampf, 75011 Paris',
            }),
        );
        expect(
            screen.getByRole('application', {
                name: 'Carte : 12 rue Oberkampf, 75011 Paris',
            }),
        ).not.toHaveClass('hidden');
    });

    it('shows nothing without an address, without a key, or when Google finds nothing', async () => {
        const { container: empty } = render(
            <PropertyAddressMap address={null} />,
        );
        expect(empty).toBeEmptyDOMElement();

        pageProps.features.googleMapsKey = null;
        const { container: keyless } = render(
            <PropertyAddressMap address="12 rue Oberkampf" />,
        );
        expect(keyless).toBeEmptyDOMElement();

        // Adresse introuvable : le cadre reste replié plutôt que vide.
        pageProps.features.googleMapsKey = 'browser-key';
        const { maps } = fakeMaps([]);
        loadGoogleMaps.mockResolvedValue(maps);
        render(<PropertyAddressMap address="12 rue Introuvable" />);
        await vi.advanceTimersByTimeAsync(900);

        expect(
            screen.getByRole('application', {
                name: 'Carte : 12 rue Introuvable',
            }),
        ).toHaveClass('hidden');
    });
});
