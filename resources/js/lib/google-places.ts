import { details, suggest } from '@/routes/places';

export type ResolvedAddress = {
    street: string;
    postalCode: string;
    city: string;
    countryCode: string | null;
    countryName: string;
};

/** Ce qu'on cherche : une adresse précise, ou seulement une ville. */
export type PlaceKind = 'address' | 'cities';

export type PlaceSuggestion = {
    id: string;
    main: string;
    secondary: string;
    /** Récupère l'adresse détaillée (termine la session de facturation Google). */
    resolve: () => Promise<ResolvedAddress>;
};

/** Session d'autocomplétion : un jeton par saisie, pour la tarification Google. */
export type PlacesSession = {
    token?: string;
};

function newToken(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`Places : ${response.status}`);
    }

    return (await response.json()) as T;
}

/**
 * Suggestions d'adresses via le proxy Laravel (`/places/suggest`) :
 * la clé Google reste côté serveur.
 */
export async function fetchPlaceSuggestions(
    input: string,
    regionCodes: string[],
    session: PlacesSession,
    kind: PlaceKind = 'address',
): Promise<PlaceSuggestion[]> {
    session.token ??= newToken();
    const token = session.token;

    const { suggestions } = await getJson<{
        suggestions: { id: string; main: string; secondary: string }[];
    }>(
        suggest.url({
            query: { input, regions: regionCodes, session: token, kind },
        }),
    );

    return suggestions.map((suggestion) => ({
        ...suggestion,
        resolve: async () => {
            // Une ville se lit dans la suggestion, mais son pays (pour le
            // drapeau) demande « details » ; si la requête échoue, la ville
            // part sans pays plutôt que de bloquer la saisie (28 octobre 2026).
            const fromSuggestion: ResolvedAddress = {
                street: '',
                postalCode: '',
                city: suggestion.main,
                countryCode: null,
                countryName: suggestion.secondary,
            };

            try {
                const { address } = await getJson<{
                    address: ResolvedAddress;
                }>(
                    details.url({
                        query: { place_id: suggestion.id, session: token },
                    }),
                );

                return kind === 'cities'
                    ? {
                          ...fromSuggestion,
                          city: address.city || suggestion.main,
                          countryCode: address.countryCode,
                          countryName:
                              address.countryName || suggestion.secondary,
                      }
                    : address;
            } catch (error) {
                if (kind !== 'cities') {
                    throw error;
                }

                return fromSuggestion;
            } finally {
                session.token = undefined;
            }
        },
    }));
}
