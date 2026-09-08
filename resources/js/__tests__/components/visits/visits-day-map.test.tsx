import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => {
    const markers: { label: string; fill?: string; map: unknown }[] = [];
    let mapOptions: Record<string, unknown> | null = null;
    let fitted = 0;

    class Marker {
        entry: { label: string; fill?: string; map: unknown };

        constructor(options: {
            label: { text: string };
            icon: { fillColor?: string };
            map: unknown;
        }) {
            this.entry = {
                label: options.label.text,
                fill: options.icon.fillColor,
                map: options.map,
            };
            markers.push(this.entry);
        }

        setMap(map: unknown) {
            this.entry.map = map;
        }
    }

    class LatLngBounds {
        points: { lat: number; lng: number }[] = [];

        extend(point: { lat: number; lng: number }) {
            this.points.push(point);
        }

        getCenter() {
            return this.points[0];
        }
    }

    class Map {
        constructor(_el: HTMLElement, options: Record<string, unknown>) {
            mapOptions = options;
        }

        fitBounds() {
            fitted += 1;
        }

        setCenter() {}

        setZoom() {}
    }

    return {
        markers,
        get mapOptions() {
            return mapOptions;
        },
        get fitted() {
            return fitted;
        },
        maps: { Map, Marker, LatLngBounds, SymbolPath: { CIRCLE: 0 } },
        reset() {
            markers.length = 0;
            mapOptions = null;
            fitted = 0;
        },
    };
});

const loadGoogleMaps = vi.hoisted(() => vi.fn());
vi.mock('@/lib/google-maps', () => ({ loadGoogleMaps }));

const page = vi.hoisted(() => ({
    props: {
        features: {
            addressAutocomplete: false,
            googleMapsKey: 'browser-key' as string | null,
        },
    },
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => page,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import { VisitsDayMap } from '@/components/visits/visits-day-map';
import { defaultVisitDay, groupVisitsByDay } from '@/lib/visits';
import { makeVisit } from '@/test/fixtures/visit';

const now = new Date('2026-09-15T08:00:00+02:00');
const visits = [
    makeVisit({ scheduled_at: '2026-09-15T14:00:00+02:00' }),
    makeVisit({
        id: 2,
        uuid: 'v2',
        scheduled_at: '2026-09-15T10:00:00+02:00',
        status: 'cancelled',
        status_label: 'Annulée',
        client: { id: 2, uuid: 'client-2', name: 'Paul Roux', reference: null },
        property: {
            ...makeVisit().property,
            id: 2,
            label: 'Studio · 3e',
            street: '5 rue de Bretagne',
            postal_code: '75003',
            latitude: 48.8627,
            longitude: 2.3623,
        },
    }),
    makeVisit({
        id: 3,
        uuid: 'v3',
        scheduled_at: '2026-09-15T16:00:00+02:00',
        client: { id: 3, uuid: 'client-3', name: 'Ana Silva', reference: null },
        property: {
            ...makeVisit().property,
            id: 3,
            label: 'T3 · 9e',
            latitude: null,
            longitude: null,
        },
    }),
    makeVisit({
        id: 5,
        uuid: 'v5',
        scheduled_at: '2026-09-15T18:00:00+02:00',
        client: {
            id: 5,
            uuid: 'client-5',
            name: 'Lou Bernard',
            reference: null,
        },
        property: {
            ...makeVisit().property,
            id: 5,
            label: 'Maison · Vincennes',
            street: '2 avenue de Paris',
            postal_code: '94300',
            city: 'Vincennes',
            district: null,
            latitude: null,
            longitude: null,
        },
    }),
    makeVisit({
        id: 4,
        uuid: 'v4',
        scheduled_at: '2026-09-16T11:00:00+02:00',
        client: {
            id: 4,
            uuid: 'client-4',
            name: 'Marc Petit',
            reference: null,
        },
    }),
];

function renderMap() {
    const days = groupVisitsByDay(visits, now);
    const initial = defaultVisitDay(days, now)!;

    return render(<VisitsDayMap days={days} initialDay={initial} now={now} />);
}

describe('VisitsDayMap', () => {
    beforeEach(() => {
        fake.reset();
        loadGoogleMaps.mockReset();
        loadGoogleMaps.mockResolvedValue(fake.maps);
        page.props.features.googleMapsKey = 'browser-key';
        vi.stubGlobal('google', { maps: fake.maps });
    });

    it('plots the located visits of the day as numbered pins in time order and lists the route', async () => {
        renderMap();

        expect(
            screen.getByRole('heading', {
                name: /Aujourd'hui · mardi 15 septembre 2026/,
            }),
        ).toBeInTheDocument();
        expect(screen.getByText('4 visites')).toBeInTheDocument();

        await waitFor(() => expect(fake.markers).toHaveLength(3));
        expect(loadGoogleMaps).toHaveBeenCalledWith('browser-key');
        // Numéros = rang dans la journée (10:00 → 1, 14:00 → 2, 16:00 → 3 au centre du 11e, 18:00 hors Paris non localisée).
        expect(fake.markers.map((marker) => marker.label)).toEqual([
            '1',
            '2',
            '3',
        ]);
        expect(fake.markers[0]?.fill).toBe('#94a3b8');
        expect(fake.markers[1]?.fill).toBe('#2563eb');
        expect(fake.fitted).toBe(1);

        const route = within(
            screen.getByRole('list', { name: 'Tournée du jour' }),
        );
        const items = route.getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('10:00');
        expect(items[0]).toHaveTextContent('Paul Roux');
        expect(items[0]).toHaveTextContent('5 rue de Bretagne, 75003 Paris');
        expect(items[1]).toHaveTextContent('14:00');
        expect(items[2]).toHaveTextContent('Ana Silva');
        expect(
            within(items[2] as HTMLElement).getByLabelText(
                'Position approximative, au centre de l’arrondissement',
            ),
        ).toBeInTheDocument();
        expect(items[3]).toHaveTextContent('Lou Bernard');
        expect(
            within(items[3] as HTMLElement).getByLabelText(
                'Adresse non localisée',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText(/1 adresse non géocodée/)).toBeInTheDocument();
        expect(screen.getByText(/1 adresse non localisée/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Itinéraire de la tournée' }),
        ).toHaveAttribute(
            'href',
            expect.stringContaining('google.com/maps/dir/'),
        );
    });

    it('navigates to the previous and next days with visits, and back to today', async () => {
        const user = userEvent.setup();
        renderMap();

        const previous = screen.getByRole('button', { name: 'Jour précédent' });
        const next = screen.getByRole('button', { name: 'Jour suivant' });
        const today = screen.getByRole('button', { name: "Aujourd'hui" });
        expect(previous).toBeDisabled();
        expect(today).toBeDisabled();

        await user.click(next);
        expect(
            screen.getByRole('heading', {
                name: /Demain · mercredi 16 septembre 2026/,
            }),
        ).toBeInTheDocument();
        expect(screen.getByText('1 visite')).toBeInTheDocument();
        expect(next).toBeDisabled();
        await waitFor(() =>
            expect(
                fake.markers.filter((marker) => marker.map !== null),
            ).toHaveLength(1),
        );

        await user.click(today);
        expect(
            screen.getByRole('heading', { name: /Aujourd'hui/ }),
        ).toBeInTheDocument();
    });

    it('falls back to a note without a browser key or when the map fails', async () => {
        page.props.features.googleMapsKey = null;
        const { unmount } = renderMap();
        expect(screen.getByRole('note')).toHaveTextContent(
            'Carte indisponible',
        );
        unmount();

        page.props.features.googleMapsKey = 'browser-key';
        loadGoogleMaps.mockRejectedValue(new Error('offline'));
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        renderMap();
        expect(
            await screen.findByText('La carte n’a pas pu être chargée.'),
        ).toBeInTheDocument();
    });
});
