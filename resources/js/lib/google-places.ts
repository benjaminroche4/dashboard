/// <reference types="google.maps" />

let loading: Promise<google.maps.PlacesLibrary> | null = null;

export function googleMapsApiKey(): string {
    return (
        (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? ''
    );
}

/**
 * Charge l'API Google Maps (bibliothèque Places) une seule fois.
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

type AnyComponent = {
    types: string[];
    longText?: string | null;
    shortText?: string | null;
    long_name?: string;
    short_name?: string;
};

/** Reconstruit une adresse à partir des composants Google (API New ou ancienne). */
export function parseAddressComponents(
    components: AnyComponent[] | null | undefined,
): ResolvedAddress {
    const pick = (type: string, short = false) => {
        const component = components?.find((candidate) =>
            candidate.types.includes(type),
        );

        if (!component) {
            return '';
        }

        return (
            (short
                ? (component.shortText ?? component.short_name)
                : (component.longText ?? component.long_name)) ?? ''
        );
    };

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

export type PlaceSuggestion = {
    id: string;
    main: string;
    secondary: string;
    /** Récupère l'adresse détaillée (consomme la session). */
    resolve: () => Promise<ResolvedAddress>;
};

/** Session d'autocomplétion : un jeton par saisie, quel que soit le fournisseur. */
export type PlacesSession = {
    token?: google.maps.places.AutocompleteSessionToken;
    /** Une fois l'API New refusée (non activée), on reste sur l'ancienne. */
    legacy?: boolean;
};

function isPermissionDenied(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);

    return /PERMISSION_DENIED|not been used|disabled|403/i.test(message);
}

async function fetchWithNewApi(
    places: google.maps.PlacesLibrary,
    input: string,
    regionCodes: string[],
    session: PlacesSession,
): Promise<PlaceSuggestion[]> {
    session.token ??= new places.AutocompleteSessionToken();

    const { suggestions } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: session.token,
            language: 'fr',
            includedRegionCodes: regionCodes,
        });

    return suggestions
        .filter((suggestion) => suggestion.placePrediction)
        .map((suggestion) => {
            const prediction = suggestion.placePrediction!;

            return {
                id: prediction.placeId,
                main: prediction.mainText?.text ?? prediction.text.text,
                secondary: prediction.secondaryText?.text ?? '',
                resolve: async () => {
                    const place = prediction.toPlace();
                    await place.fetchFields({ fields: ['addressComponents'] });
                    session.token = undefined;

                    return parseAddressComponents(place.addressComponents);
                },
            };
        });
}

function fetchWithLegacyApi(
    places: google.maps.PlacesLibrary,
    input: string,
    regionCodes: string[],
    session: PlacesSession,
): Promise<PlaceSuggestion[]> {
    session.token ??= new places.AutocompleteSessionToken();
    const service = new places.AutocompleteService();

    return new Promise((resolve, reject) => {
        void service.getPlacePredictions(
            {
                input,
                sessionToken: session.token,
                componentRestrictions: { country: regionCodes },
            },
            (predictions, status) => {
                if (
                    status ===
                    google.maps.places.PlacesServiceStatus.ZERO_RESULTS
                ) {
                    resolve([]);

                    return;
                }

                if (
                    status !== google.maps.places.PlacesServiceStatus.OK ||
                    !predictions
                ) {
                    reject(new Error(`Places (ancienne API) : ${status}`));

                    return;
                }

                resolve(
                    predictions.map((prediction) => ({
                        id: prediction.place_id,
                        main:
                            prediction.structured_formatting?.main_text ??
                            prediction.description,
                        secondary:
                            prediction.structured_formatting?.secondary_text ??
                            '',
                        resolve: () =>
                            new Promise<ResolvedAddress>((ok, fail) => {
                                new places.PlacesService(
                                    document.createElement('div'),
                                ).getDetails(
                                    {
                                        placeId: prediction.place_id,
                                        fields: ['address_components'],
                                        sessionToken: session.token,
                                    },
                                    (place, detailStatus) => {
                                        session.token = undefined;

                                        if (
                                            detailStatus !==
                                                google.maps.places
                                                    .PlacesServiceStatus.OK ||
                                            !place
                                        ) {
                                            fail(
                                                new Error(
                                                    `Détails du lieu : ${detailStatus}`,
                                                ),
                                            );

                                            return;
                                        }

                                        ok(
                                            parseAddressComponents(
                                                place.address_components,
                                            ),
                                        );
                                    },
                                );
                            }),
                    })),
                );
            },
        );
    });
}

/**
 * Suggestions d'adresses. Tente l'API Places « New » ; si le projet Google ne
 * l'a pas activée, bascule sur l'ancienne API pour le reste de la session.
 */
export async function fetchPlaceSuggestions(
    input: string,
    regionCodes: string[],
    session: PlacesSession,
): Promise<PlaceSuggestion[]> {
    const places = await loadGooglePlaces();

    if (session.legacy) {
        return fetchWithLegacyApi(places, input, regionCodes, session);
    }

    try {
        return await fetchWithNewApi(places, input, regionCodes, session);
    } catch (error) {
        if (!isPermissionDenied(error)) {
            throw error;
        }

        session.legacy = true;
        session.token = undefined;

        return fetchWithLegacyApi(places, input, regionCodes, session);
    }
}
