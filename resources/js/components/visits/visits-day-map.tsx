/// <reference types="google.maps" />
import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, MapPin, MapPinOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { loadGoogleMaps } from '@/lib/google-maps';
import { propertyPosition } from '@/lib/paris-geo';
import { cn } from '@/lib/utils';
import {
    chronologicalDays,
    dayKey,
    timeFormat,
    visitPropertyLine,
    visitTours,
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
    className,
}: {
    apiKey: string;
    visits: Visit[];
    onError: () => void;
    className?: string;
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
            className={cn(
                'bg-muted h-72 w-full rounded-lg sm:h-full sm:min-h-80',
                className,
            )}
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
    const [tourKey, setTourKey] = useState('all');
    const [mapFailed, setMapFailed] = useState(false);
    const index = ordered.findIndex((day) => day.key === key);
    const day = ordered[index] ?? initialDay;
    const previous = ordered[index - 1];
    const next = ordered[index + 1];
    const todayKey = dayKey(now);
    const today = ordered.find((candidate) => candidate.key === todayKey);
    // Une journée chargée mêle les itinéraires de plusieurs membres : un
    // onglet par tournée, et la carte suit celle qu'on regarde.
    const tours = visitTours(day.visits);
    const tour = tours.find((candidate) => candidate.key === tourKey);
    const shown = tour?.visits ?? day.visits;
    const stops = located(shown);
    const unlocated = shown.length - stops.length;
    const approximate = stops.filter(
        (stop) => stop.position.approximate,
    ).length;
    const count = `${day.visits.length} visite${day.visits.length > 1 ? 's' : ''}`;
    const tabs = [{ key: 'all', label: 'Tous', visits: day.visits }, ...tours];

    return (
        // La carte remplit la section ; la tournée flotte par-dessus, dans un
        // panneau à gauche (sous la carte sur mobile).
        <section
            aria-label="Visites du jour"
            className="bg-muted relative grid overflow-hidden rounded-xl border sm:block sm:h-[30rem]"
        >
            {features.googleMapsKey && !mapFailed ? (
                <GoogleVisitsMap
                    className="h-64 rounded-none sm:absolute sm:inset-0 sm:h-full sm:min-h-0"
                    apiKey={features.googleMapsKey}
                    visits={shown}
                    onError={() => setMapFailed(true)}
                />
            ) : (
                <div
                    role="note"
                    className="text-muted-foreground grid h-64 place-items-center px-4 text-center text-sm sm:absolute sm:inset-0 sm:h-full sm:pl-[23rem]"
                >
                    <div className="grid max-w-xs justify-items-center gap-2">
                        <MapPinOff className="size-5" aria-hidden />
                        <p>
                            {mapFailed
                                ? 'La carte n’a pas pu être chargée.'
                                : 'Carte indisponible : ajoutez une clé Google Maps navigateur pour voir les visites sur la carte.'}
                        </p>
                    </div>
                </div>
            )}
            <div className="bg-background sm:ring-foreground/10 flex min-h-0 flex-col border-t sm:absolute sm:inset-y-3 sm:left-3 sm:w-[22rem] sm:rounded-xl sm:border-0 sm:shadow-lg sm:ring-1">
                <header className="flex items-start justify-between gap-3 p-4 pb-3">
                    <div className="grid min-w-0 gap-0.5">
                        <h2
                            aria-label={
                                day.relative
                                    ? `${day.relative} · ${day.label}`
                                    : day.label
                            }
                            className="truncate text-sm font-semibold first-letter:uppercase"
                        >
                            {day.relative ?? day.label}
                        </h2>
                        <p className="text-muted-foreground flex min-w-0 gap-1 text-xs first-letter:uppercase">
                            {day.relative && (
                                <>
                                    <span className="truncate">
                                        {day.label}
                                    </span>
                                    <span aria-hidden>·</span>
                                </>
                            )}
                            <span className="shrink-0 tabular-nums">
                                {count}
                            </span>
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center rounded-lg border">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-r-none"
                            aria-label="Jour précédent"
                            disabled={!previous}
                            onClick={() => previous && setKey(previous.key)}
                        >
                            <ChevronLeft aria-hidden />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-7 rounded-none border-x px-2 text-xs"
                            disabled={!today || today.key === key}
                            onClick={() => today && setKey(today.key)}
                        >
                            Aujourd'hui
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-l-none"
                            aria-label="Jour suivant"
                            disabled={!next}
                            onClick={() => next && setKey(next.key)}
                        >
                            <ChevronRight aria-hidden />
                        </Button>
                    </div>
                </header>
                {/* Une journée à plusieurs mêle les itinéraires : une pastille
                    par tournée, hors de la zone qui défile. */}
                {tours.length > 1 && (
                    <div
                        role="tablist"
                        aria-label="Tournée par membre"
                        className="flex gap-1 overflow-x-auto px-4 pb-3"
                    >
                        {tabs.map((candidate) => (
                            <button
                                key={candidate.key}
                                type="button"
                                role="tab"
                                aria-selected={candidate.key === tourKey}
                                onClick={() => setTourKey(candidate.key)}
                                className={cn(
                                    'flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs whitespace-nowrap transition-colors',
                                    candidate.key === tourKey
                                        ? 'bg-foreground text-background font-medium'
                                        : 'bg-muted text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {candidate.label}
                                <span className="tabular-nums opacity-70">
                                    {candidate.visits.length}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                {/* La tournée défile dans sa propre hauteur : une journée
                    chargée ne fait pas grandir la carte. */}
                <ol
                    aria-label="Tournée du jour"
                    role="list"
                    className="border-foreground/5 grid max-h-80 min-h-0 flex-1 content-start gap-0.5 overflow-y-auto overscroll-contain border-t p-2 sm:max-h-none"
                >
                    {shown.map((visit, position) => {
                        const spot = propertyPosition(visit.property);

                        return (
                            <li
                                key={visit.id}
                                className="hover:bg-muted/60 flex gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors"
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
                                <div className="grid min-w-0 flex-1 gap-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="flex min-w-0 items-baseline gap-2">
                                            <span className="shrink-0 font-medium tabular-nums">
                                                {timeFormat.format(
                                                    new Date(
                                                        visit.scheduled_at,
                                                    ),
                                                )}
                                            </span>
                                            <Link
                                                href={clientShow({
                                                    lead: visit.client.uuid,
                                                })}
                                                className="truncate font-medium underline-offset-4 hover:underline"
                                            >
                                                {visit.client.name}
                                            </Link>
                                        </p>
                                        <VisitStatusBadge
                                            status={visit.status}
                                            label={visit.status_label}
                                        />
                                    </div>
                                    <p className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
                                        {spot === null ? (
                                            <MapPinOff
                                                className="size-3 shrink-0"
                                                aria-label="Adresse non localisée"
                                            />
                                        ) : spot.approximate ? (
                                            <MapPin
                                                className="size-3 shrink-0 opacity-60"
                                                aria-label="Position approximative, au centre de l’arrondissement"
                                            />
                                        ) : (
                                            <MapPin
                                                className="size-3 shrink-0"
                                                aria-hidden
                                            />
                                        )}
                                        <span className="truncate">
                                            {visitPropertyLine(visit)}
                                        </span>
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
                {(approximate > 0 || unlocated > 0) && (
                    <div className="text-muted-foreground border-foreground/5 grid gap-1 border-t px-4 py-2.5 text-xs">
                        {approximate > 0 && (
                            <p>
                                {approximate} adresse
                                {approximate > 1 ? 's' : ''} non géocodée
                                {approximate > 1 ? 's' : ''} : pastille au
                                centre de l’arrondissement.
                            </p>
                        )}
                        {unlocated > 0 && (
                            <p>
                                {unlocated} adresse{unlocated > 1 ? 's' : ''}{' '}
                                non localisée{unlocated > 1 ? 's' : ''} :
                                absente{unlocated > 1 ? 's' : ''} de la carte.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
