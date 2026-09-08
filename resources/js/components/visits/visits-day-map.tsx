/// <reference types="google.maps" />
import { Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    MapPin,
    MapPinOff,
    Route,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { loadGoogleMaps } from '@/lib/google-maps';
import { propertyPosition } from '@/lib/paris-geo';
import { cn } from '@/lib/utils';
import {
    chronologicalDays,
    dayKey,
    directionsUrl,
    timeFormat,
    visitAddress,
    type VisitDay,
} from '@/lib/visits';
import { show as clientShow } from '@/routes/clients';
import type { Visit } from '@/types';

const PARIS = { lat: 48.8589, lng: 2.3469 };
const BLUE = '#2563eb';
const SLATE = '#94a3b8';

/** Fond discret, cohérent avec la carte des arrondissements. */
const mapStyles: google.maps.MapTypeStyle[] = [
    {
        elementType: 'geometry',
        stylers: [{ saturation: -60 }, { lightness: 20 }],
    },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

/** Pastille numérotée d'une visite : bleue pour une visite planifiée, grise sinon. */
function pin(
    number: number,
    active: boolean,
    approximate = false,
): { icon: google.maps.Symbol; label: google.maps.MarkerLabel } {
    return {
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: active ? BLUE : SLATE,
            // Position approximative (centre de l'arrondissement) : pastille plus pâle, contour marqué.
            fillOpacity: approximate ? 0.55 : 1,
            strokeColor: approximate ? (active ? BLUE : SLATE) : '#ffffff',
            strokeWeight: 2,
        },
        label: {
            text: String(number),
            fontSize: '12px',
            fontWeight: '700',
            color: '#ffffff',
        },
    };
}

type Stop = {
    visit: Visit;
    number: number;
    position: { lat: number; lng: number; approximate: boolean };
};

/**
 * Visites plaçables sur la carte, numérotées dans l'ordre du jour (numéro =
 * rang dans la journée) : position géocodée, sinon centre de l'arrondissement.
 */
function located(visits: Visit[]): Stop[] {
    return visits.flatMap((visit, index) => {
        const position = propertyPosition(visit.property);

        return position ? [{ visit, number: index + 1, position }] : [];
    });
}

/** Carte Google des visites d'un jour, une pastille numérotée par bien. */
function GoogleVisitsMap({
    apiKey,
    visits,
    onError,
}: {
    apiKey: string;
    visits: Visit[];
    onError: () => void;
}) {
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<google.maps.Map | null>(null);
    const markers = useRef<google.maps.Marker[]>([]);
    const errorRef = useRef(onError);
    errorRef.current = onError;

    useEffect(() => {
        let cancelled = false;

        loadGoogleMaps(apiKey)
            .then((maps) => {
                if (cancelled || !container.current) {
                    return;
                }
                map.current ??= new maps.Map(container.current, {
                    center: PARIS,
                    zoom: 12,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'cooperative',
                    clickableIcons: false,
                    styles: mapStyles,
                });
                for (const marker of markers.current) {
                    marker.setMap(null);
                }
                markers.current = [];
                const bounds = new maps.LatLngBounds();
                for (const { visit, number, position } of located(visits)) {
                    const point = { lat: position.lat, lng: position.lng };
                    markers.current.push(
                        new maps.Marker({
                            map: map.current,
                            position: point,
                            title: `${timeFormat.format(new Date(visit.scheduled_at))} · ${visit.client.name} · ${visit.property.label}${position.approximate ? ' (position approximative)' : ''}`,
                            ...pin(
                                number,
                                visit.status === 'planned',
                                position.approximate,
                            ),
                        }),
                    );
                    bounds.extend(point);
                }
                if (markers.current.length === 1) {
                    map.current.setCenter(bounds.getCenter());
                    map.current.setZoom(15);
                } else if (markers.current.length > 1) {
                    map.current.fitBounds(bounds, 48);
                }
            })
            .catch((error: unknown) => {
                console.error('Carte des visites indisponible :', error);
                errorRef.current();
            });

        return () => {
            cancelled = true;
        };
    }, [apiKey, visits]);

    return (
        <div
            ref={container}
            role="img"
            aria-label="Carte des visites du jour"
            className="bg-muted h-72 w-full rounded-lg sm:h-full sm:min-h-80"
        />
    );
}

/**
 * Bloc « Visites du jour » : navigation de jour en jour, carte des biens à
 * visiter avec pastilles numérotées, et la tournée dans l'ordre à côté.
 */
export function VisitsDayMap({
    days,
    initialDay,
    now = new Date(),
}: {
    days: VisitDay[];
    initialDay: VisitDay;
    now?: Date;
}) {
    const { features } = usePage().props;
    const ordered = chronologicalDays(days);
    const [key, setKey] = useState(initialDay.key);
    const [mapFailed, setMapFailed] = useState(false);
    const index = ordered.findIndex((day) => day.key === key);
    const day = ordered[index] ?? initialDay;
    const previous = ordered[index - 1];
    const next = ordered[index + 1];
    const todayKey = dayKey(now);
    const today = ordered.find((candidate) => candidate.key === todayKey);
    const stops = located(day.visits);
    const unlocated = day.visits.length - stops.length;
    const approximate = stops.filter(
        (stop) => stop.position.approximate,
    ).length;
    const route = directionsUrl(day.visits);
    const title = day.relative ? `${day.relative} · ${day.label}` : day.label;

    return (
        <section
            aria-label="Visites du jour"
            className="bg-sidebar grid gap-4 rounded-xl border p-4"
        >
            <header className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CalendarDays
                        className="text-muted-foreground size-4"
                        aria-hidden
                    />
                    <h2 className="text-base font-medium first-letter:uppercase">
                        {title}
                    </h2>
                    <span className="text-muted-foreground text-sm tabular-nums">
                        {day.visits.length} visite
                        {day.visits.length > 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        aria-label="Jour précédent"
                        disabled={!previous}
                        onClick={() => previous && setKey(previous.key)}
                    >
                        <ChevronLeft aria-hidden />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!today || today.key === key}
                        onClick={() => today && setKey(today.key)}
                    >
                        Aujourd'hui
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        aria-label="Jour suivant"
                        disabled={!next}
                        onClick={() => next && setKey(next.key)}
                    >
                        <ChevronRight aria-hidden />
                    </Button>
                </div>
            </header>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                {features.googleMapsKey && !mapFailed ? (
                    <GoogleVisitsMap
                        apiKey={features.googleMapsKey}
                        visits={day.visits}
                        onError={() => setMapFailed(true)}
                    />
                ) : (
                    <div
                        role="note"
                        className="bg-muted text-muted-foreground grid h-72 place-items-center rounded-lg px-4 text-center text-sm sm:h-full sm:min-h-80"
                    >
                        <div className="grid justify-items-center gap-2">
                            <MapPinOff className="size-5" aria-hidden />
                            <p>
                                {mapFailed
                                    ? 'La carte n’a pas pu être chargée.'
                                    : 'Carte indisponible : ajoutez une clé Google Maps navigateur pour voir les visites sur la carte.'}
                            </p>
                        </div>
                    </div>
                )}
                <ol
                    aria-label="Tournée du jour"
                    className="grid content-start gap-2"
                >
                    {day.visits.map((visit, position) => {
                        const spot = propertyPosition(visit.property);

                        return (
                            <li
                                key={visit.id}
                                className="bg-background flex items-start gap-3 rounded-lg border p-3 text-sm"
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                                        visit.status === 'planned'
                                            ? 'bg-blue-600'
                                            : 'bg-slate-400',
                                    )}
                                >
                                    {position + 1}
                                </span>
                                <div className="grid min-w-0 flex-1 gap-0.5">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="font-medium tabular-nums">
                                            {timeFormat.format(
                                                new Date(visit.scheduled_at),
                                            )}
                                        </span>
                                        <Link
                                            href={clientShow({
                                                lead: visit.client.uuid,
                                            })}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            {visit.client.name}
                                        </Link>
                                        <VisitStatusBadge
                                            status={visit.status}
                                            label={visit.status_label}
                                        />
                                    </div>
                                    <span className="truncate">
                                        {visit.property.label}
                                    </span>
                                    <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                                        {spot === null ? (
                                            <MapPinOff
                                                className="size-3"
                                                aria-label="Adresse non localisée"
                                            />
                                        ) : spot.approximate ? (
                                            <MapPin
                                                className="size-3 opacity-60"
                                                aria-label="Position approximative, au centre de l’arrondissement"
                                            />
                                        ) : (
                                            <MapPin
                                                className="size-3"
                                                aria-hidden
                                            />
                                        )}
                                        {visitAddress(visit)}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                    {approximate > 0 && (
                        <li className="text-muted-foreground text-xs">
                            {approximate} adresse{approximate > 1 ? 's' : ''}{' '}
                            non géocodée{approximate > 1 ? 's' : ''} : pastille
                            au centre de l’arrondissement.
                        </li>
                    )}
                    {unlocated > 0 && (
                        <li className="text-muted-foreground text-xs">
                            {unlocated} adresse{unlocated > 1 ? 's' : ''} non
                            localisée{unlocated > 1 ? 's' : ''} : absente
                            {unlocated > 1 ? 's' : ''} de la carte.
                        </li>
                    )}
                    {route && (
                        <li className="pt-1">
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={route}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Route aria-hidden />
                                    Itinéraire de la tournée
                                </a>
                            </Button>
                        </li>
                    )}
                </ol>
            </div>
        </section>
    );
}
