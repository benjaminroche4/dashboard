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
import { loadGoogleMaps } from '@/lib/google-maps';
import { map as agenciesMap } from '@/routes/agencies';

/** Agence géocodée renvoyée par `agencies.map`. */
export type AgencyMapPoint = {
    uuid: string;
    name: string;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    latitude: number;
    longitude: number;
    phone: string | null;
    agents_count: number;
    url: string;
};

/** Fond discret, le même que la carte des biens et celle des visites. */
const mapStyles: google.maps.MapTypeStyle[] = [
    {
        elementType: 'geometry',
        stylers: [{ saturation: -60 }, { lightness: 20 }],
    },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const PARIS = { lat: 48.8566, lng: 2.3522 };
/** Bordeaux de la marque : une agence n'a pas d'état, une seule couleur suffit. */
const BRAND = '#71172e';

/** La pastille se dessine avec l'API chargée, jamais avec le global `google` : hors navigateur il n'existe pas. */
function pin(maps: typeof google.maps): google.maps.Symbol {
    return {
        path: maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: BRAND,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
    };
}

function addressLine(agency: AgencyMapPoint): string {
    return [
        agency.street,
        [agency.postal_code, agency.city].filter(Boolean).join(' '),
    ]
        .filter(Boolean)
        .join(', ');
}

/** Contenu de l'infobulle : nom cliquable, adresse, téléphone, nombre d'agents. */
function bubble(agency: AgencyMapPoint): string {
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
    const agents =
        agency.agents_count === 1 ? '1 agent' : `${agency.agents_count} agents`;

    return `<div style="display:grid;gap:2px;padding:12px 14px;font:400 13px/1.4 system-ui;max-width:15rem">
        <a href="${agency.url}" style="font-weight:600;color:#0a0a0a">${escape(agency.name)}</a>
        <span style="color:#64748b">${escape(addressLine(agency) || 'Adresse non renseignée')}</span>
        <span>${agency.phone ? `${escape(agency.phone)} · ` : ''}${agents}</span>
    </div>`;
}

/**
 * Toutes les agences géocodées sur une carte Google : une pastille par
 * agence, son nom, son adresse et ses agents dans l'infobulle. La liste est
 * paginée, la carte ne l'est pas : elle charge `agencies.map` à la première
 * ouverture. Sans clé navigateur, la modale l'explique.
 */
export function AgenciesMapDialog({
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
    const [agencies, setAgencies] = useState<AgencyMapPoint[] | null>(null);

    useEffect(() => {
        if (!open || agencies !== null) {
            return;
        }

        let cancelled = false;

        fetch(agenciesMap().url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then((response) =>
                response.ok ? response.json() : Promise.reject(response.status),
            )
            .then((points: unknown) => {
                if (!cancelled) {
                    setAgencies(Array.isArray(points) ? points : []);
                }
            })
            .catch(() => !cancelled && setFailed(true));

        return () => {
            cancelled = true;
        };
    }, [open, agencies]);

    useEffect(() => {
        if (!open || !key || !agencies || agencies.length === 0) {
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
                // Sans l'en-tête de Google : sa croix réservait une bande vide au-dessus du contenu.
                const info = new maps.InfoWindow({ headerDisabled: true });
                const bounds = new maps.LatLngBounds();

                for (const agency of agencies) {
                    const point = {
                        lat: agency.latitude,
                        lng: agency.longitude,
                    };
                    const marker = new maps.Marker({
                        map,
                        position: point,
                        title: agency.name,
                        icon: pin(maps),
                    });

                    marker.addListener('click', () => {
                        info.setContent(bubble(agency));
                        info.open({ map, anchor: marker });
                    });
                    bounds.extend(point);
                }

                if (agencies.length === 1) {
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
        // La carte est reconstruite à chaque ouverture.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, key, agencies]);

    const message =
        agencies === null && !failed
            ? 'Chargement des agences…'
            : (agencies?.length ?? 0) === 0
              ? 'Aucune agence n’a d’adresse localisée : renseignez la rue et le code postal pour les placer sur la carte.'
              : !key
                ? 'La carte demande une clé Google Maps (GOOGLE_MAPS_BROWSER_KEY).'
                : failed
                  ? 'La carte n’a pas pu être chargée.'
                  : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Les agences sur la carte</DialogTitle>
                    <DialogDescription>
                        {agencies === null
                            ? 'Toutes les agences dont l’adresse est localisée.'
                            : `${agencies.length} agence(s) située(s) · cliquez une pastille pour ouvrir sa fiche.`}
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
                        aria-label="Carte des agences"
                        className="h-[28rem] w-full overflow-hidden rounded-lg border"
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

/** Bouton « Voir sur la carte » de la liste des agences, et sa modale. */
export function AgenciesMapButton() {
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
            <AgenciesMapDialog open={open} onOpenChange={setOpen} />
        </>
    );
}
