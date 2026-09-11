/// <reference types="google.maps" />
import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps';
import { cn } from '@/lib/utils';

/** Fond discret, le même que les autres cartes du dashboard. */
const mapStyles: google.maps.MapTypeStyle[] = [
    {
        elementType: 'geometry',
        stylers: [{ saturation: -60 }, { lightness: 20 }],
    },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

/** Le temps qu'on arrête de taper avant d'interroger Google. */
const DEBOUNCE_MS = 800;

/**
 * Carte de l'adresse en cours de saisie, dans le récapitulatif d'un bien :
 * l'adresse est géocodée dans le navigateur (clé navigateur), la carte se
 * recadre à chaque changement. Sans clé, sans rue ou si Google ne trouve
 * rien, rien ne s'affiche : le récapitulatif ne montre pas de cadre vide.
 */
export function PropertyAddressMap({
    address,
    className,
}: {
    /** Adresse sur une ligne (rue, code postal, ville) ; null tant qu'il n'y a pas de rue. */
    address: string | null;
    className?: string;
}) {
    const { features } = usePage().props;
    const key = features?.googleMapsKey ?? null;
    const container = useRef<HTMLDivElement | null>(null);
    const map = useRef<google.maps.Map | null>(null);
    const marker = useRef<google.maps.Marker | null>(null);
    const [located, setLocated] = useState(false);

    useEffect(() => {
        if (!key || address === null) {
            setLocated(false);

            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(() => {
            loadGoogleMaps(key)
                .then(async (maps) => {
                    const { results } = await new maps.Geocoder().geocode({
                        address,
                        componentRestrictions: { country: 'FR' },
                    });
                    const position = results[0]?.geometry.location;

                    if (cancelled || !position || !container.current) {
                        return;
                    }

                    map.current ??= new maps.Map(container.current, {
                        zoom: 16,
                        disableDefaultUI: true,
                        zoomControl: true,
                        clickableIcons: false,
                        styles: mapStyles,
                    });
                    marker.current ??= new maps.Marker({ map: map.current });

                    map.current.setCenter(position);
                    marker.current.setPosition(position);
                    setLocated(true);
                })
                // Adresse introuvable ou carte indisponible : on n'affiche rien.
                .catch(() => !cancelled && setLocated(false));
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [key, address]);

    if (!key || address === null) {
        return null;
    }

    return (
        <div
            ref={container}
            role="application"
            aria-label={`Carte : ${address}`}
            className={cn(
                'h-40 w-full overflow-hidden rounded-lg border',
                // Tant que Google n'a rien situé, le cadre reste replié.
                !located && 'hidden',
                className,
            )}
        />
    );
}
