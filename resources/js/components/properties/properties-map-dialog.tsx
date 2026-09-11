/// <reference types="google.maps" />
import { usePage } from '@inertiajs/react';
import { Map as MapIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatMoney } from '@/lib/format';
import { loadGoogleMaps } from '@/lib/google-maps';
import { propertyPosition } from '@/lib/paris-geo';
import {
    map as propertiesMap,
    show as propertyShow,
} from '@/routes/properties';
import type { PropertyStatus } from '@/types';

/** Bien situable renvoyé par `properties.map`. */
export type MapPoint = {
    uuid: string;
    label: string;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    district: number | null;
    latitude: number | null;
    longitude: number | null;
    status: PropertyStatus;
    status_label: string;
    /** Proposable : statut ouvert et aucun client dessus. */
    is_available: boolean;
    /** Client à qui le bien est attribué, le cas échéant. */
    assigned_to: string | null;
    rent_cents: number | null;
    currency: string;
};

/** Fond discret, le même que la carte des visites. */
const mapStyles: google.maps.MapTypeStyle[] = [
    {
        elementType: 'geometry',
        stylers: [{ saturation: -60 }, { lightness: 20 }],
    },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const PARIS = { lat: 48.8566, lng: 2.3522 };
/** Vert « disponible », gris pour tout le reste : la même lecture que les badges. */
const GREEN = '#15803d';
const SLATE = '#64748b';

/** Pastille d'un bien : verte s'il est proposable, plus pâle si la position est approximative. */
function pin(open: boolean, approximate: boolean): google.maps.Symbol {
    return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: open ? GREEN : SLATE,
        // Position déduite de l'arrondissement : pastille pâle au contour marqué.
        fillOpacity: approximate ? 0.5 : 1,
        strokeColor: approximate ? (open ? GREEN : SLATE) : '#ffffff',
        strokeWeight: 2,
    };
}

/** Bien situé sur la carte, avec sa position et sa précision. */
function located(properties: MapPoint[]) {
    return properties.flatMap((property) => {
        const position = propertyPosition(property);

        return position ? [{ property, position }] : [];
    });
}

/** Adresse d'un bien sur une ligne. */
function addressLine(property: MapPoint): string {
    return [
        property.street,
        [property.postal_code, property.city].filter(Boolean).join(' '),
    ]
        .filter(Boolean)
        .join(', ');
}

/** Contenu de l'infobulle : nom cliquable, adresse, loyer et statut. */
function bubble(property: MapPoint): string {
    const rent =
        property.rent_cents === null
            ? 'Loyer non renseigné'
            : `${formatMoney(property.rent_cents, property.currency)} / mois`;
    const escape = (value: string) =>
        value.replace(
            /[&<>"]/g,
            (char) =>
                ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                })[char] ?? char,
        );

    return `<div style="display:grid;gap:2px;font:400 13px/1.4 system-ui;max-width:15rem">
        <a href="${propertyShow({ property: property.uuid }).url}" style="font-weight:600;color:#0a0a0a">${escape(property.label)}</a>
        <span style="color:#64748b">${escape(addressLine(property) || 'Adresse non renseignée')}</span>
        <span>${escape(rent)} · ${escape(property.status_label)}</span>
        ${property.assigned_to ? `<span style="color:#15803d;font-weight:600">Attribué à ${escape(property.assigned_to)}</span>` : ''}
    </div>`;
}

/**
 * Tous les biens de l'annuaire sur une carte Google : une pastille par bien,
 * verte s'il est disponible ou sous option. Un bien sans coordonnées mais avec
 * un arrondissement est posé au centre de celui-ci, en pastille pâle ; les
 * autres sont comptés sous la carte. Sans clé navigateur, la modale l'explique.
 */
export function PropertiesMapDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { features } = usePage().props;
    const key = features?.googleMapsKey ?? null;
    const container = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);
    const [properties, setProperties] = useState<MapPoint[] | null>(null);
    const stops = located(properties ?? []);
    const approximate = stops.filter(
        (stop) => stop.position.approximate,
    ).length;
    const missing = (properties?.length ?? 0) - stops.length;

    // Les biens sont chargés une fois, à la première ouverture.
    useEffect(() => {
        if (!open || properties !== null) {
            return;
        }

        let cancelled = false;

        fetch(propertiesMap().url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) =>
                response.ok ? response.json() : Promise.reject(response.status),
            )
            .then((points: unknown) => {
                if (!cancelled) {
                    setProperties(Array.isArray(points) ? points : []);
                }
            })
            .catch(() => !cancelled && setFailed(true));

        return () => {
            cancelled = true;
        };
    }, [open, properties]);

    useEffect(() => {
        if (!open || !key || stops.length === 0) {
            return;
        }

        let cancelled = false;

        loadGoogleMaps(key)
            .then((maps) => {
                if (cancelled || !container.current) {
                    return;
                }

                const map = new maps.Map(container.current, {
                    center: PARIS,
                    zoom: 12,
                    disableDefaultUI: true,
                    zoomControl: true,
                    clickableIcons: false,
                    styles: mapStyles,
                });
                const info = new maps.InfoWindow();
                const bounds = new maps.LatLngBounds();

                for (const { property, position } of stops) {
                    const point = { lat: position.lat, lng: position.lng };
                    const marker = new maps.Marker({
                        map,
                        position: point,
                        title: `${property.label}${position.approximate ? ' (position approximative)' : ''}`,
                        icon: pin(property.is_available, position.approximate),
                    });

                    marker.addListener('click', () => {
                        info.setContent(bubble(property));
                        info.open({ map, anchor: marker });
                    });
                    bounds.extend(point);
                }

                if (stops.length === 1) {
                    map.setCenter(bounds.getCenter());
                    map.setZoom(15);
                } else {
                    map.fitBounds(bounds, 48);
                }
            })
            .catch(() => !cancelled && setFailed(true));

        return () => {
            cancelled = true;
        };
        // La carte est reconstruite à chaque ouverture : les biens affichés
        // suivent les filtres de la liste.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, key, properties]);

    const message =
        properties === null && !failed
            ? 'Chargement des biens…'
            : stops.length === 0
              ? 'Aucun bien n’a d’adresse localisée : renseignez la rue et le code postal pour les placer sur la carte.'
              : !key
                ? 'La carte demande une clé Google Maps (GOOGLE_MAPS_BROWSER_KEY).'
                : failed
                  ? 'La carte n’a pas pu être chargée.'
                  : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Les biens sur la carte</DialogTitle>
                    <DialogDescription>
                        {stops.length} bien(s) situé(s)
                        {approximate > 0 &&
                            ` · ${approximate} au centre de leur arrondissement`}
                        {missing > 0 && ` · ${missing} sans adresse localisée`}
                    </DialogDescription>
                </DialogHeader>

                {message ? (
                    <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                        {message}
                    </p>
                ) : (
                    <div
                        ref={container}
                        role="application"
                        aria-label="Carte des biens"
                        className="h-[28rem] w-full overflow-hidden rounded-lg border"
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Bouton « Voir sur la carte » de l'annuaire, et sa modale. Les biens sont
 * chargés depuis `properties.map` : la liste, elle, est paginée.
 */
export function PropertiesMapButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(true)}
            >
                <MapIcon />
                Voir sur la carte
            </Button>
            <PropertiesMapDialog open={open} onOpenChange={setOpen} />
        </>
    );
}
