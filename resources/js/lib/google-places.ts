/// <reference types="google.maps" />

let loading: Promise<google.maps.PlacesLibrary> | null = null;

export function googleMapsApiKey(): string {
    return (
        (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? ''
    );
}

/**
 * Charge l'API Google Maps (bibliothèque Places, API « New ») une seule fois.
 * Résout avec `google.maps.places`, rejette si la clé manque ou si le script échoue.
 */
export function loadGooglePlaces(): Promise<google.maps.PlacesLibrary> {
    if (loading) {
        return loading;
    }

    const key = googleMapsApiKey();

    if (!key) {
        return Promise.reject(
            new Error('Clé Google Maps absente (VITE_GOOGLE_MAPS_API_KEY).'),
        );
    }

    loading = new Promise<google.maps.PlacesLibrary>((resolve, reject) => {
        const finish = () =>
            (
                google.maps.importLibrary(
                    'places',
                ) as Promise<google.maps.PlacesLibrary>
            )
                .then(resolve)
                .catch(reject);

        if (
            typeof google !== 'undefined' &&
            typeof google.maps?.importLibrary === 'function'
        ) {
            void finish();

            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=fr`;
        script.async = true;
        script.onload = () => void finish();
        script.onerror = () =>
            reject(new Error('Impossible de charger Google Maps.'));
        document.head.appendChild(script);
    }).catch((error: unknown) => {
        loading = null;
        throw error;
    });

    return loading;
}

export type ResolvedAddress = {
    street: string;
    postalCode: string;
    city: string;
    countryCode: string | null;
    countryName: string;
};

/** Reconstruit une adresse à partir des composants Google. */
export function parseAddressComponents(
    components: google.maps.places.AddressComponent[] | null | undefined,
): ResolvedAddress {
    const pick = (type: string, short = false) =>
        components?.find((component) => component.types.includes(type))?.[
            short ? 'shortText' : 'longText'
        ] ?? '';

    const number = pick('street_number');
    const route = pick('route');

    return {
        street: [number, route].filter(Boolean).join(' '),
        postalCode: pick('postal_code'),
        city:
            pick('locality') ||
            pick('postal_town') ||
            pick('administrative_area_level_2'),
        countryCode: pick('country', true) || null,
        countryName: pick('country'),
    };
}
