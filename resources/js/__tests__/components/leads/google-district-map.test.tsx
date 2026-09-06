import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = () => void;

const fake = vi.hoisted(() => {
    const polygons: {
        options: Record<string, unknown>;
        listeners: Listener[];
        setOptions: (options: Record<string, unknown>) => void;
    }[] = [];
    const markers: { label: string; icon: { fillColor?: string } }[] = [];
    let mapOptions: Record<string, unknown> | null = null;

    class Polygon {
        options: Record<string, unknown>;
        listeners: Listener[] = [];

        constructor(options: Record<string, unknown>) {
            this.options = options;
            polygons.push(this);
        }

        addListener(_event: string, listener: Listener) {
            this.listeners.push(listener);
        }

        setOptions(options: Record<string, unknown>) {
            this.options = { ...this.options, ...options };
        }
    }

    class Marker {
        entry: { label: string; icon: { fillColor?: string } };

        constructor(options: {
            label: { text: string };
            icon: { fillColor?: string };
        }) {
            this.entry = { label: options.label.text, icon: options.icon };
            markers.push(this.entry);
        }

        setIcon(icon: { fillColor?: string }) {
            this.entry.icon = icon;
        }

        setLabel(label: { text: string }) {
            this.entry.label = label.text;
        }
    }

    class Map {
        constructor(_el: HTMLElement, options: Record<string, unknown>) {
            mapOptions = options;
        }
    }

    return {
        polygons,
        markers,
        get mapOptions() {
            return mapOptions;
        },
        maps: { Map, Polygon, Marker, SymbolPath: { CIRCLE: 0 } },
        reset() {
            polygons.length = 0;
            markers.length = 0;
            mapOptions = null;
        },
    };
});

const loadGoogleMaps = vi.hoisted(() => vi.fn());

vi.mock('@/lib/google-maps', () => ({ loadGoogleMaps }));

const page = vi.hoisted(() => ({
    props: {
        features: { addressAutocomplete: false, googleMapsKey: 'browser-key' },
    },
}));

vi.mock('@inertiajs/react', () => ({ usePage: () => page }));

import { DistrictMap } from '@/components/leads/district-map';
import { GoogleDistrictMap } from '@/components/leads/google-district-map';

describe('GoogleDistrictMap', () => {
    beforeEach(() => {
        fake.reset();
        loadGoogleMaps.mockReset();
        loadGoogleMaps.mockResolvedValue(fake.maps);
        vi.stubGlobal('google', { maps: fake.maps });
    });

    it('draws one clickable outline per arrondissement and reflects the selection', async () => {
        const onToggle = vi.fn();
        const { rerender } = render(
            <GoogleDistrictMap
                apiKey="browser-key"
                value={[6]}
                onToggle={onToggle}
            />,
        );

        await waitFor(() => expect(fake.polygons).toHaveLength(20));
        expect(loadGoogleMaps).toHaveBeenCalledWith('browser-key');
        expect(fake.markers.map((marker) => marker.label)).toContain('6');
        expect(fake.mapOptions).toMatchObject({
            zoom: 12,
            disableDefaultUI: true,
        });

        rerender(
            <GoogleDistrictMap
                apiKey="browser-key"
                value={[6]}
                onToggle={onToggle}
            />,
        );
        const sixth = fake.polygons[5];
        const first = fake.polygons[0];
        expect(sixth?.options.fillColor).toBe('#2563eb');
        expect(sixth?.options.fillOpacity).toBe(0.2);
        expect(first?.options.fillColor).toBe('#475569');
        expect(fake.markers[5]?.icon.fillColor).toBe('#2563eb');
        expect(fake.markers[0]?.icon.fillColor).toBe('#ffffff');

        act(() => first?.listeners[0]?.());
        expect(onToggle).toHaveBeenCalledWith(1);
    });

    it('reports the failure and renders nothing when the API fails to load', async () => {
        const error = new Error('offline');
        const onError = vi.fn();
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        loadGoogleMaps.mockRejectedValue(error);

        render(
            <GoogleDistrictMap
                apiKey="k"
                value={[]}
                onToggle={vi.fn()}
                onError={onError}
            />,
        );

        await waitFor(() =>
            expect(
                document.querySelector('[data-test="google-district-map"]'),
            ).toBeNull(),
        );
        expect(onError).toHaveBeenCalledWith(error);
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });
});

describe('DistrictMap with a Google key', () => {
    beforeEach(() => {
        fake.reset();
        loadGoogleMaps.mockReset();
        loadGoogleMaps.mockResolvedValue(fake.maps);
        vi.stubGlobal('google', { maps: fake.maps });
    });

    it('shows the map plus a keyboard-friendly row of numbers', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<DistrictMap value={[3]} onChange={onChange} />);

        expect(
            document.querySelector('[data-test="google-district-map"]'),
        ).not.toBeNull();
        await waitFor(() => expect(fake.polygons).toHaveLength(20));

        await user.click(
            screen.getByRole('button', { name: '11e arrondissement' }),
        );
        expect(onChange).toHaveBeenCalledWith([3, 11]);
        expect(
            screen.getByRole('button', { name: '3e arrondissement' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('falls back to the schematic map when Google Maps fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        loadGoogleMaps.mockRejectedValue(new Error('offline'));

        render(<DistrictMap value={[]} onChange={vi.fn()} />);

        await waitFor(() =>
            expect(
                document.querySelector('[data-test="google-district-map"]'),
            ).toBeNull(),
        );
        // La carte schématique porte la Seine en SVG.
        expect(
            screen
                .getByRole('group', { name: 'Arrondissements visés' })
                .querySelector('svg'),
        ).not.toBeNull();
        vi.restoreAllMocks();
    });

    it('shows the map read-only on the lead page, without click handlers', async () => {
        render(<DistrictMap value={[3]} readOnly />);

        expect(
            document.querySelector('[data-test="google-district-map"]'),
        ).not.toBeNull();
        await waitFor(() => expect(fake.polygons).toHaveLength(20));
        expect(fake.polygons[0]?.listeners).toHaveLength(0);
        expect(fake.polygons[2]?.options.fillColor).toBe('#2563eb');
        // Sous la carte : seulement les quartiers visés, pas les vingt numéros.
        const chosen = screen.getByRole('list', {
            name: 'Arrondissements visés',
        });
        expect(chosen).toHaveTextContent('3e');
        expect(chosen.querySelectorAll('li')).toHaveLength(1);
        expect(
            screen.queryByRole('button', { name: '3e arrondissement' }),
        ).not.toBeInTheDocument();
    });
});
