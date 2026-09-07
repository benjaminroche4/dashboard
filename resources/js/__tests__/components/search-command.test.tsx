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
                                  url: '/leads/7',
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
            expect.stringContaining('/leads/search?q=zo'),
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(visit).toHaveBeenCalledWith('/leads/7');
        vi.unstubAllGlobals();
    });
});
