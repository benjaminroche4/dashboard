import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { patch },
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

vi.mock('@/lib/toast', () => ({ notify: { error: vi.fn() } }));

import { LeadQuotes } from '@/components/leads/lead-quotes';

const uuid = '0199a9a0-0000-7000-8000-000000000007';

describe('LeadQuotes', () => {
    beforeEach(() => {
        patch.mockReset();
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve([
                            {
                                id: 9,
                                uuid: '0199a9a0-0000-7000-8000-00000000d009',
                                number: 'DV-27009',
                                client_name: 'Nestlé',
                                amount_cents: 219_000,
                                currency: 'EUR',
                                status_label: 'Brouillon',
                                lead: null,
                            },
                        ]),
                }),
            ),
        );
    });

    it('links an existing quote found by number or client', async () => {
        const user = userEvent.setup();
        render(<LeadQuotes leadId={7} leadUuid={uuid} quotes={[]} canEdit />);

        await user.click(
            screen.getByRole('button', { name: 'Lier un devis existant' }),
        );
        await user.type(
            await screen.findByPlaceholderText('Numéro ou client du devis…'),
            'nes',
        );
        await user.click(await screen.findByText('DV-27009 · Nestlé'));

        await waitFor(() =>
            expect(patch).toHaveBeenCalledWith(
                '/tools/quotes/0199a9a0-0000-7000-8000-00000000d009/lead',
                { lead_id: 7 },
                expect.anything(),
            ),
        );
    });

    it('lists the quotes with amount and status, and links to a prefilled creation', () => {
        render(
            <LeadQuotes
                leadId={7}
                leadUuid={uuid}
                canEdit
                quotes={[
                    {
                        id: 3,
                        uuid: '0199a9a0-0000-7000-8000-00000000d001',
                        number: 'DV-27003',
                        client_name: 'Léa Durand',
                        amount_cents: 128_639,
                        currency: 'EUR',
                        status: 'sent',
                        status_label: 'Envoyé',
                        issued_at: '2026-09-07',
                        valid_until: '2026-10-07',
                    },
                ]}
            />,
        );

        expect(screen.getByRole('link', { name: /DV-27003/ })).toHaveAttribute(
            'href',
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001',
        );
        expect(screen.getByText('Envoyé')).toHaveAttribute(
            'data-status',
            'sent',
        );
        expect(screen.getByText(/1.286,39/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Créer un devis/ }),
        ).toHaveAttribute('href', `/tools/quotes/create?lead=${uuid}`);
    });

    it('shows an empty state and no creation link for members', () => {
        render(
            <LeadQuotes
                leadId={7}
                leadUuid={uuid}
                quotes={[]}
                canEdit={false}
            />,
        );

        expect(
            screen.getByText('Aucun devis pour ce lead.'),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /Créer un devis/ }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Lier un devis existant' }),
        ).toBeNull();
    });
});
