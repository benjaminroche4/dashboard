import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { visit, pageProps } = vi.hoisted(() => ({
    visit: vi.fn(),
    pageProps: {
        auth: {
            user: { id: 1, name: 'Admin', role: 'admin' },
            can: { manageStaff: true, viewPulse: true },
            access: null as Record<string, string> | null,
        },
    },
}));

vi.mock('@inertiajs/react', () => ({
    router: { visit },
    usePage: () => ({ props: pageProps }),
}));

import { buildNavGroups } from '@/components/app-sidebar';
import {
    SearchCommand,
    destinations,
    matchDestinations,
    rememberRecent,
    visibleDestinations,
} from '@/components/search-command';
import type { NavGroup, SearchHit } from '@/types';

const PLACEHOLDER =
    'Rechercher un nom, une référence, un téléphone, une adresse…';

function hit(overrides: Partial<SearchHit> = {}): SearchHit {
    return {
        kind: 'clients',
        id: 1,
        uuid: 'c-1',
        title: 'Zoé Martin',
        subtitle: 'LD-0001',
        meta: 'Confié',
        url: '/clients/c-1',
        score: 3,
        ...overrides,
    };
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

const fetchMock = vi.fn();

describe('SearchCommand', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue(jsonResponse({ groups: [], mine: [] }));
        vi.stubGlobal('fetch', fetchMock);
        pageProps.auth.access = null;
        pageProps.auth.can.manageStaff = true;
    });
    afterEach(() => vi.unstubAllGlobals());

    it('renders a search field with the ⌘K hint', () => {
        render(<SearchCommand />);

        expect(
            screen.getByRole('button', { name: 'Rechercher' }),
        ).toHaveTextContent('Rechercher…');
        expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('opens the palette on click and navigates to a page', async () => {
        const user = userEvent.setup();
        render(<SearchCommand />);

        await user.click(screen.getByRole('button', { name: 'Rechercher' }));

        expect(
            await screen.findByPlaceholderText(PLACEHOLDER),
        ).toBeInTheDocument();
        await user.click(screen.getByText('Sécurité'));

        expect(visit).toHaveBeenCalledWith('/settings/security');
    });

    it('toggles with ⌘K', async () => {
        const user = userEvent.setup();
        render(<SearchCommand />);

        await user.keyboard('{Meta>}k{/Meta}');

        expect(
            await screen.findByPlaceholderText(PLACEHOLDER),
        ).toBeInTheDocument();
    });

    it('asks the server once, shows « Recherche… » meanwhile, then the groups in their order', async () => {
        const user = userEvent.setup();
        let resolve: (value: Response) => void = () => undefined;
        fetchMock.mockImplementation((url: string) =>
            url.includes('q=zo')
                ? new Promise<Response>((r) => {
                      resolve = r;
                  })
                : Promise.resolve(jsonResponse({ groups: [], mine: [] })),
        );
        render(<SearchCommand />);

        await user.click(screen.getByRole('button', { name: 'Rechercher' }));
        await user.type(await screen.findByPlaceholderText(PLACEHOLDER), 'zo');

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Recherche…',
        );
        expect(screen.queryByText('Aucun résultat.')).toBeNull();
        // La requête part après le délai de frappe : on l'attend avant de répondre.
        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('q=zo'),
                expect.anything(),
            ),
        );

        resolve(
            jsonResponse({
                groups: [
                    {
                        kind: 'clients',
                        heading: 'Dossiers clients',
                        hits: [hit()],
                    },
                    {
                        kind: 'properties',
                        heading: 'Biens',
                        hits: [
                            hit({
                                kind: 'properties',
                                uuid: 'p-1',
                                title: 'Studio 11e',
                                subtitle: '3 rue Zoé',
                                meta: 'Disponible',
                                url: '/properties/p-1',
                                score: 1,
                            }),
                        ],
                    },
                ],
                mine: [],
            }),
        );

        expect(await screen.findByText('Zoé Martin')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith(
            '/search?q=zo',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        // Une seule requête par saisie : pas une par annuaire.
        expect(
            fetchMock.mock.calls.filter(([url]) =>
                String(url).includes('q=zo'),
            ),
        ).toHaveLength(1);
        // Le groupe le mieux noté (dossiers) précède les biens dans le document.
        const clients = screen.getByText('Dossiers clients');
        const properties = screen.getByText('Biens');
        expect(
            clients.compareDocumentPosition(properties) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        // Les pages se filtrent sans accent : « zo » ne garde aucune page.
        expect(screen.queryByText('Sécurité')).toBeNull();

        await user.click(screen.getByText('Zoé Martin'));
        expect(visit).toHaveBeenCalledWith('/clients/c-1');
    });

    it('offers to create the lead from a search without result, with the name prefilled', async () => {
        const user = userEvent.setup();
        render(<SearchCommand />);

        await user.click(screen.getByRole('button', { name: 'Rechercher' }));
        await user.type(
            await screen.findByPlaceholderText(PLACEHOLDER),
            'Léa Durand',
        );

        const create = await screen.findByText('Créer le lead « Léa Durand »');
        await user.click(create);

        expect(visit).toHaveBeenCalledWith(
            '/locataires/create?name=L%C3%A9a+Durand',
        );
    });

    it('shows my dossiers and the recently opened items when the palette opens empty', async () => {
        const user = userEvent.setup();
        localStorage.setItem(
            'dashboard.search.recent',
            JSON.stringify([
                hit({ uuid: 'r-1', title: 'Paul Récent', url: '/clients/r-1' }),
            ]),
        );
        fetchMock.mockResolvedValue(
            jsonResponse({
                groups: [],
                mine: [
                    hit({
                        uuid: 'm-1',
                        title: 'Mon Dossier',
                        url: '/clients/m-1',
                    }),
                ],
            }),
        );
        render(<SearchCommand />);

        await user.click(screen.getByRole('button', { name: 'Rechercher' }));

        expect(await screen.findByText('Mon Dossier')).toBeInTheDocument();
        expect(screen.getByText('Paul Récent')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringMatching(/^\/search(\?q=)?$/),
            expect.objectContaining({ credentials: 'same-origin' }),
        );
    });

    it('hides the pages of closed sections and the team page for non-admins', () => {
        const access = Object.fromEntries(
            destinations
                .filter((d) => d.section)
                .map((d) => [d.section, 'none']),
        ) as Record<string, string>;
        access.invoices = 'read';

        const titles = visibleDestinations(access as never, false).map(
            (d) => d.title,
        );

        expect(titles).toContain('Factures');
        expect(titles).toContain('Aujourd’hui');
        expect(titles).not.toContain('Dossiers clients');
        expect(titles).not.toContain('Nouveau lead locataire');
        expect(titles).not.toContain('Équipe');
    });

    it('lists every link of the sidebar among its destinations', () => {
        const navUrls = buildNavGroups({
            leadsTodo: 0,
            ownerLeadsTodo: 0,
            clients: 0,
            pendingUploads: 0,
        })
            .flatMap((group: NavGroup) => group.items)
            .flatMap((item) => [item, ...(item.items ?? [])])
            .map((item) =>
                typeof item.href === 'string' ? item.href : item.href.url,
            );
        const missing = navUrls.filter(
            (url) => !destinations.some((d) => d.url === url),
        );

        // Une page ajoutée au menu doit aussi se trouver depuis ⌘K.
        expect(missing).toEqual([]);
    });

    it('filters pages without accents and remembers six recents at most', () => {
        expect(
            matchDestinations(destinations, 'securite').map((d) => d.title),
        ).toEqual(['Sécurité']);

        let recent: SearchHit[] = [];
        for (let i = 0; i < 8; i += 1) {
            recent = rememberRecent(
                recent,
                hit({ uuid: `u-${i}`, url: `/c/${i}` }),
            );
        }
        expect(recent).toHaveLength(6);
        expect(recent[0]?.url).toBe('/c/7');
        // Rouvrir une fiche la remonte sans la dupliquer.
        recent = rememberRecent(recent, hit({ uuid: 'u-5', url: '/c/5' }));
        expect(recent).toHaveLength(6);
        expect(recent[0]?.url).toBe('/c/5');
    });
});
