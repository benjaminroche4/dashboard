import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { transit as propertyTransit } from '@/routes/properties';
import type { TransitStop } from '@/types';

/** Adresse saisie dans le formulaire d'un bien. */
export type TransitAddress = {
    street: string;
    postal_code: string;
    city: string;
};

/** Le temps qu'on arrête de taper avant d'interroger l'assistant. */
const DEBOUNCE_MS = 1_200;

/** Clé d'une adresse : deux saisies équivalentes ne relancent pas la recherche. */
function addressKey(address: TransitAddress): string {
    return [address.street, address.postal_code, address.city]
        .map((part) => part.trim().replace(/\s+/g, ' ').toLowerCase())
        .join('|');
}

/**
 * Transports proches cherchés **tout seuls** dès que l'adresse est renseignée :
 * l'assistant répond en arrière-plan et les arrêts rejoignent le formulaire,
 * où le récapitulatif les affiche. Une adresse déjà cherchée n'est pas
 * relancée, et une panne reste silencieuse : c'est un bonus, pas une saisie.
 */
export function useNearbyTransit(
    address: TransitAddress,
    onFound: (stops: TransitStop[]) => void,
): { searching: boolean } {
    const { features } = usePage().props;
    const enabled = features?.assistant ?? false;
    const [searching, setSearching] = useState(false);
    // Dernière adresse cherchée : sans elle, chaque frappe relancerait l'appel.
    const searched = useRef<string | null>(null);
    // La dernière valeur du rappel, pour ne pas relancer si le parent se rerend.
    const found = useRef(onFound);
    found.current = onFound;

    const key = addressKey(address);
    const ready =
        address.street.trim() !== '' && address.postal_code.trim() !== '';

    useEffect(() => {
        if (!enabled || !ready || searched.current === key) {
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(() => {
            searched.current = key;
            setSearching(true);

            fetch(propertyTransit().url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
                body: JSON.stringify(address),
            })
                .then((response) =>
                    response.ok
                        ? response.json()
                        : Promise.reject(response.status),
                )
                .then((payload: unknown) => {
                    if (cancelled) {
                        return;
                    }

                    const stops =
                        payload !== null &&
                        typeof payload === 'object' &&
                        'stops' in payload &&
                        Array.isArray(payload.stops)
                            ? (payload.stops as TransitStop[])
                            : [];

                    if (stops.length > 0) {
                        found.current(stops);
                    }
                })
                // Assistant absent, en panne ou quartier inconnu : rien à dire.
                .catch(() => undefined)
                .finally(() => !cancelled && setSearching(false));
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
        // `address` est reconstruit à chaque frappe : sa clé suffit à décider.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, ready, key]);

    return { searching };
}
