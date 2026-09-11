/// <reference types="google.maps" />
import { usePage } from '@inertiajs/react';
import { Map, MapPin } from 'lucide-react';
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

/** Fond discret, identique à la carte des visites. */
const mapStyles: google.maps.MapTypeStyle[] = [
    {
        elementType: 'geometry',
        stylers: [{ saturation: -60 }, { lightness: 20 }],
    },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export type MappedPlace = {
    name: string;
    address: string | null;
    /** Rue saisie : sans elle, l'adresse ne situe rien de précis. */
    street?: string | null;
    latitude: number | null;
    longitude: number | null;
};

/** Lien d'itinéraire : les coordonnées si on les a, l'adresse sinon. */
export function directionsUrl(place: MappedPlace): string {
    const destination =
        place.latitude !== null && place.longitude !== null
            ? `${place.latitude},${place.longitude}`
            : (place.address ?? place.name);

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * Modale « Voir sur la carte » : la position d'une agence, d'un agent ou d'un
 * partenaire sur une carte Google, avec un lien d'itinéraire. Sans clé
 * navigateur ou sans position, la modale l'explique au lieu d'une carte vide.
 */
export function AddressMapDialog({
    place,
    open,
    onOpenChange,
}: {
    place: MappedPlace;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { features } = usePage().props;
    const key = features?.googleMapsKey ?? null;
    const container = useRef<HTMLDivElement | null>(null);
    const [failed, setFailed] = useState(false);
    const located = place.latitude !== null && place.longitude !== null;

    useEffect(() => {
        if (!open || !key || !located) {
            return;
        }

        let cancelled = false;

        loadGoogleMaps(key)
            .then((maps) => {
                if (cancelled || !container.current) {
                    return;
                }

                const position = {
                    lat: place.latitude as number,
                    lng: place.longitude as number,
                };
                const map = new maps.Map(container.current, {
                    center: position,
                    zoom: 15,
                    disableDefaultUI: true,
                    zoomControl: true,
                    styles: mapStyles,
                });

                new maps.Marker({ map, position, title: place.name });
            })
            .catch(() => !cancelled && setFailed(true));

        return () => {
            cancelled = true;
        };
    }, [open, key, located, place.latitude, place.longitude, place.name]);

    const message = !located
        ? 'Adresse non localisée : renseignez la rue, le code postal et la ville pour la placer sur la carte.'
        : !key
          ? 'La carte demande une clé Google Maps (GOOGLE_MAPS_BROWSER_KEY).'
          : failed
            ? 'La carte n’a pas pu être chargée.'
            : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{place.name}</DialogTitle>
                    <DialogDescription>
                        {place.address ?? 'Adresse non renseignée'}
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
                        aria-label={`Carte : ${place.name}`}
                        className="h-80 w-full overflow-hidden rounded-lg border"
                    />
                )}

                <Button
                    variant="outline"
                    asChild
                    className="justify-self-start"
                >
                    <a
                        href={directionsUrl(place)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <MapPin />
                        Itinéraire
                    </a>
                </Button>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Bouton « Voir sur la carte » et sa modale, à poser sous une adresse de
 * fiche (agence, agent, partenaire).
 */
export function AddressMapButton({ place }: { place: MappedPlace }) {
    const [open, setOpen] = useState(false);

    // Le bouton promet une carte : il n'apparaît que si l'adresse est
    // géocodée. Avec une rue seule, la modale n'aurait qu'un message
    // d'excuse à montrer — autant ne rien proposer.
    if (place.latitude === null || place.longitude === null) {
        return null;
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-fit"
                onClick={() => setOpen(true)}
            >
                <Map />
                Voir sur la carte
            </Button>
            <AddressMapDialog
                place={place}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    );
}
