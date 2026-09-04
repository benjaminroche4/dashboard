import { details, suggest } from '@/routes/places';

export type ResolvedAddress = {
    street: string;
    postalCode: string;
    city: string;
    countryCode: string | null;
    countryName: string;
};

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
): Promise<PlaceSuggestion[]> {
    session.token ??= newToken();
    const token = session.token;

    const { suggestions } = await getJson<{
        suggestions: { id: string; main: string; secondary: string }[];
    }>(suggest.url({ query: { input, regions: regionCodes, session: token } }));

    return suggestions.map((suggestion) => ({
        ...suggestion,
        resolve: async () => {
            const { address } = await getJson<{ address: ResolvedAddress }>(
                details.url({
                    query: { place_id: suggestion.id, session: token },
                }),
            );
            session.token = undefined;

            return address;
        },
    }));
}
