import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps';
import { arrondissementOutlines } from '@/lib/paris-arrondissements-geo';
import { parisDistricts } from '@/lib/paris-districts';

const PARIS = { lat: 48.8589, lng: 2.3469 };

/** Fond discret : carte désaturée et éclaircie, sans commerces, transports ni noms de rues. */
const mapStyles: google.maps.MapTypeStyle[] = [
    {
        elementType: 'geometry',
        stylers: [{ saturation: -70 }, { lightness: 25 }],
    },
    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    {
        featureType: 'road',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#f1f5f9' }],
    },
    {
        featureType: 'road.arterial',
        elementType: 'geometry',
        stylers: [{ color: '#e2e8f0' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#e2e8f0' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#cfe3f4' }],
    },
    {
        featureType: 'administrative',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
    },
];

const BLUE = '#2563eb';
const SLATE = '#475569';

/** Trois états de calque : neutre, survolé, sélectionné. Fin et transparent pour laisser lire la carte. */
const layer = {
    idle: {
        fillColor: SLATE,
        fillOpacity: 0.03,
        strokeColor: SLATE,
        strokeOpacity: 0.45,
        strokeWeight: 1,
    },
    hover: {
        fillColor: BLUE,
        fillOpacity: 0.1,
        strokeColor: BLUE,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
    },
    selected: {
        fillColor: BLUE,
        fillOpacity: 0.2,
        strokeColor: BLUE,
        strokeOpacity: 1,
        strokeWeight: 2,
    },
};

/** Pastille numérotée au centre de chaque arrondissement, blanche ou bleue. */
function badge(
    selected: boolean,
    number: number,
): { icon: google.maps.Symbol; label: google.maps.MarkerLabel } {
    return {
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: selected ? BLUE : '#ffffff',
            fillOpacity: 1,
            strokeColor: selected ? '#1d4ed8' : '#cbd5e1',
            strokeWeight: 1,
        },
        label: {
            text: String(number),
            fontSize: '11px',
            fontWeight: '600',
            color: selected ? '#ffffff' : '#0f172a',
        },
    };
}

/**
 * Carte Google Maps de Paris : un polygone cliquable par arrondissement,
 * numéroté, avec les contours réels. Sélection multiple.
 */
export function GoogleDistrictMap({
    apiKey,
    value,
    onToggle,
    readOnly = false,
    onError,
}: {
    apiKey: string;
    value: number[];
    onToggle: (district: number) => void;
    /** Lecture seule : pas de clic ni de survol sur les arrondissements. */
    readOnly?: boolean;
    /** Appelé si l'API ne se charge pas ou plante : le parent affiche un repli. */
    onError?: (error: unknown) => void;
}) {
    const container = useRef<HTMLDivElement>(null);
    const polygons = useRef(new Map<number, google.maps.Polygon>());
    const markers = useRef(new Map<number, google.maps.Marker>());
    const hovered = useRef<number | null>(null);
    const toggleRef = useRef(onToggle);
    const errorRef = useRef(onError);
    const [failed, setFailed] = useState(false);

    toggleRef.current = onToggle;
    errorRef.current = onError;

    useEffect(() => {
        let cancelled = false;

        loadGoogleMaps(apiKey)
            .then((maps) => {
                if (cancelled || !container.current) {
                    return;
                }

                const map = new maps.Map(container.current, {
                    center: PARIS,
                    zoom: 12,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'cooperative',
                    clickableIcons: false,
                    styles: mapStyles,
                });

                for (const district of parisDistricts) {
                    const outline =
                        arrondissementOutlines[district.number] ?? [];
                    const polygon = new maps.Polygon({
                        map,
                        paths: outline.map(([lng, lat]) => ({ lat, lng })),
                        ...layer.idle,
                    });

                    if (readOnly) {
                        polygon.setOptions({ clickable: false });
                    } else {
                        polygon.addListener('click', () =>
                            toggleRef.current(district.number),
                        );
                        polygon.addListener('mouseover', () => {
                            hovered.current = district.number;
                            repaint();
                        });
                        polygon.addListener('mouseout', () => {
                            hovered.current = null;
                            repaint();
                        });
                    }

                    const marker = new maps.Marker({
                        map,
                        position: { lat: district.lat, lng: district.lng },
                        clickable: false,
                        ...badge(false, district.number),
                    });

                    polygons.current.set(district.number, polygon);
                    markers.current.set(district.number, marker);
                }

                repaint();
            })
            .catch((error: unknown) => {
                console.error(
                    'Carte des arrondissements indisponible :',
                    error,
                );
                setFailed(true);
                errorRef.current?.(error);
            });

        return () => {
            cancelled = true;
        };
        // repaint lit des refs : pas besoin de le suivre.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey, readOnly]);

    const valueRef = useRef(value);
    valueRef.current = value;

    /** Applique l'état de chaque arrondissement : sélection, survol, ou neutre. */
    const repaint = () => {
        for (const [number, polygon] of polygons.current) {
            const selected = valueRef.current.includes(number);

            polygon.setOptions(
                selected
                    ? layer.selected
                    : hovered.current === number
                      ? layer.hover
                      : layer.idle,
            );

            const marker = markers.current.get(number);
            const style = badge(selected, number);
            marker?.setIcon(style.icon);
            marker?.setLabel(style.label);
        }
    };

    useEffect(repaint);

    if (failed) {
        return null;
    }

    return (
        <div
            ref={container}
            data-test="google-district-map"
            aria-hidden
            className="bg-sidebar aspect-[19/12] w-full overflow-hidden rounded-lg border"
        />
    );
}
