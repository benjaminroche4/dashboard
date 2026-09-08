import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { visit } = vi.hoisted(() => ({ visit: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { visit } }));

import { SearchCommand } from '@/components/search-command';

describe('SearchCommand', () => {
    it('renders a search field with the ⌘K hint', () => {
        render(<SearchCommand />);

        expect(
            screen.getByRole('button', { name: 'Rechercher' }),
        ).toHaveTextContent('Rechercher…');
        expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('opens the palette on click and navigates on select', async () => {
        const user = userEvent.setup();
        render(<SearchCommand />);

        await user.click(screen.getByRole('button', { name: 'Rechercher' }));

        expect(
            await screen.findByPlaceholderText(
                'Rechercher une page, un lead ou un partenaire…',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('Sécurité')).toBeInTheDocument();

        await user.click(screen.getByText('Sécurité'));

        expect(visit).toHaveBeenCalledWith('/settings/security');
    });

    it('toggles with ⌘K', async () => {
        const user = userEvent.setup();
        render(<SearchCommand />);

        await user.keyboard('{Meta>}k{/Meta}');

        expect(
            await screen.findByPlaceholderText(
                'Rechercher une page, un lead ou un partenaire…',
            ),
        ).toBeInTheDocument();
    });

    it('searches leads on the server after two characters and navigates to one', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => ({
                ok: true,
                json: async () =>
                    url.includes('/partners/search')
                        ? [
                              {
                                  id: 3,
                                  uuid: 'p-3',
                                  name: 'Zoom Assurances',
                                  type: 'insurance',
                                  type_label: 'Assurance',
                                  contact: 'Marie Durand',
                                  url: '/partners/p-3',
                              },
                          ]
                        : [
                              {
                                  id: 7,
                                  reference: 'LD-7777',
                                  name: 'Zoé Martin',
                                  email: 'zoe@example.com',
                                  company: 'Nestlé',
                                  status_label: 'En cours',
                                  url: '/locataires/7',
                              },
                          ],
            })),
        );
        render(<SearchCommand />);

        await user.click(screen.getByRole('button', { name: 'Rechercher' }));
        await user.type(
            await screen.findByPlaceholderText(
                'Rechercher une page, un lead ou un partenaire…',
            ),
            'zo',
        );

        expect(await screen.findByText('Zoom Assurances')).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/partners/search?q=zo'),
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        await user.click(screen.getByText('Zoé Martin'));

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/locataires/search?q=zo'),
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(visit).toHaveBeenCalledWith('/locataires/7');
        vi.unstubAllGlobals();
    });

    it('searches invoices, quotes, properties and owners in parallel, ignoring a failing source', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                if (url.includes('/properties/search')) {
                    // Section fermée pour ce membre : la source répond 403.
                    return { ok: false, status: 403, json: async () => ({}) };
                }
                if (url.includes('/partners/search')) {
                    throw new TypeError('Failed to fetch');
                }
                if (url.includes('/invoices/search')) {
                    return {
                        ok: true,
                        json: async () => [
                            {
                                id: 1,
                                uuid: 'i-1',
                                number: 'RP-27001',
                                client_name: 'Zoé Martin',
                                amount_cents: 150000,
                                currency: 'EUR',
                                status_label: 'Envoyée',
                                url: '/invoices/i-1',
                            },
                        ],
                    };
                }
                if (url.includes('/tools/quotes/search')) {
                    return {
                        ok: true,
                        json: async () => [
                            {
                                id: 2,
                                uuid: 'q-2',
                                title: 'DV-27002',
                                subtitle: 'Zoé Martin · 1 500,00 € · Envoyé',
                                url: '/tools/quotes/q-2',
                            },
                        ],
                    };
                }
                if (url.includes('/owners/search')) {
                    return {
                        ok: true,
                        json: async () => [
                            {
                                id: 3,
                                uuid: 'o-3',
                                title: 'Zoé Propriétaire',
                                subtitle: 'Foncière Zed',
                                url: '/owners/o-3',
                            },
                        ],
                    };
                }

                return { ok: true, json: async () => [] };
            }),
        );
        render(<SearchCommand />);

        await user.click(screen.getByRole('button', { name: 'Rechercher' }));
        await user.type(
            await screen.findByPlaceholderText(
                'Rechercher une page, un lead ou un partenaire…',
            ),
            'zo',
        );

        expect(await screen.findByText('Factures')).toBeInTheDocument();
        expect(screen.getByText('RP-27001')).toBeInTheDocument();
        expect(screen.getByText('Envoyée')).toBeInTheDocument();
        expect(screen.getByText('Devis')).toBeInTheDocument();
        expect(screen.getByText('DV-27002')).toBeInTheDocument();
        expect(
            screen.getByText('Zoé Martin · 1 500,00 € · Envoyé'),
        ).toBeInTheDocument();
        expect(screen.getByText('Propriétaires')).toBeInTheDocument();
        expect(screen.getByText('Foncière Zed')).toBeInTheDocument();
        expect(screen.queryByText('Biens')).not.toBeInTheDocument();
        expect(screen.queryByText('Partenaires')).not.toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/properties/search?q=zo'),
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/owners/search?q=zo'),
            expect.objectContaining({ credentials: 'same-origin' }),
        );

        await user.click(screen.getByText('DV-27002'));

        expect(visit).toHaveBeenCalledWith('/tools/quotes/q-2');
        vi.unstubAllGlobals();
    });
});
