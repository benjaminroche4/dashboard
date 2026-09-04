import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPlaceSuggestions } from '@/lib/google-places';

function fakeFetch(routes: Record<string, unknown>) {
    return vi.fn(async (url: string) => {
        const path = new URL(url, 'http://localhost').pathname;
        const body = routes[path];

        return {
            ok: body !== undefined,
            status: body === undefined ? 404 : 200,
            json: async () => body,
        };
    });
}

describe('fetchPlaceSuggestions', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('queries the Laravel proxy with a session token and resolves details', async () => {
        const fetchMock = fakeFetch({
            '/places/suggest': {
                suggestions: [
                    {
                        id: 'p1',
                        main: 'Rue des Alpes 5',
                        secondary: '1201 Genève, Suisse',
                    },
                ],
            },
            '/places/details': {
                address: {
                    street: '5 Rue des Alpes',
                    postalCode: '1201',
                    city: 'Genève',
                    countryCode: 'CH',
                    countryName: 'Suisse',
                },
            },
        });
        vi.stubGlobal('fetch', fetchMock);

        const session = {};
        const suggestions = await fetchPlaceSuggestions(
            'Rue des',
            ['ch', 'fr'],
            session,
        );

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].main).toBe('Rue des Alpes 5');

        const suggestUrl = new URL(
            fetchMock.mock.calls[0][0] as string,
            'http://localhost',
        );
        expect(suggestUrl.searchParams.get('input')).toBe('Rue des');
        expect(suggestUrl.searchParams.getAll('regions[]')).toEqual([
            'ch',
            'fr',
        ]);
        const token = suggestUrl.searchParams.get('session');
        expect(token).toBeTruthy();

        const address = await suggestions[0].resolve();
        expect(address.city).toBe('Genève');

        const detailsUrl = new URL(
            fetchMock.mock.calls[1][0] as string,
            'http://localhost',
        );
        expect(detailsUrl.searchParams.get('place_id')).toBe('p1');
        expect(detailsUrl.searchParams.get('session')).toBe(token);
        // La session est consommée après le détail.
        expect((session as { token?: string }).token).toBeUndefined();
    });

    it('throws on a non-2xx answer', async () => {
        vi.stubGlobal('fetch', fakeFetch({}));

        await expect(fetchPlaceSuggestions('Rue', ['ch'], {})).rejects.toThrow(
            'Places : 404',
        );
    });
});
