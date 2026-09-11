import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { pageProps } = vi.hoisted(() => ({
    pageProps: { features: { googleMapsKey: null as string | null } },
}));

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: pageProps }) }));

import {
    AddressMapButton,
    directionsUrl,
} from '@/components/address-map-dialog';

const place = {
    name: 'Paris Ouest Immobilier',
    address: '12 rue Oberkampf, 75011 Paris',
    street: '12 rue Oberkampf',
    latitude: 48.8656,
    longitude: 2.3705,
};

describe('directionsUrl', () => {
    it('uses the coordinates when there are some, the address otherwise', () => {
        expect(directionsUrl(place)).toContain('destination=48.8656%2C2.3705');
        expect(
            directionsUrl({ ...place, latitude: null, longitude: null }),
        ).toContain('12%20rue%20Oberkampf');
    });
});

describe('AddressMapButton', () => {
    it('stays hidden when the address locates nothing precise', () => {
        // Un code postal et une ville, sans rue ni position : rien à montrer.
        const { container } = render(
            <AddressMapButton
                place={{
                    name: 'Bourdon',
                    address: '75010 Paris',
                    street: null,
                    latitude: null,
                    longitude: null,
                }}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('opens the map dialog and explains a missing browser key', async () => {
        const user = userEvent.setup();
        render(<AddressMapButton place={place} />);

        await user.click(
            screen.getByRole('button', { name: 'Voir sur la carte' }),
        );

        expect(
            screen.getByRole('heading', { name: 'Paris Ouest Immobilier' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('12 rue Oberkampf, 75011 Paris'),
        ).toBeInTheDocument();
        expect(screen.getByText(/clé Google Maps/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Itinéraire/ }),
        ).toHaveAttribute('href', directionsUrl(place));
    });

    it('offers nothing when the address is not geocoded, even with a street', () => {
        // Le bouton promet une carte : sans position, il n'aurait qu'un
        // message d'excuse à montrer.
        const { container } = render(
            <AddressMapButton
                place={{ ...place, latitude: null, longitude: null }}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
