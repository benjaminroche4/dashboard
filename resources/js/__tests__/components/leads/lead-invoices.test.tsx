import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: React.ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
    router: { patch },
}));
vi.mock('@/lib/toast', () => ({ notify: { error: vi.fn() } }));

import { LeadInvoices } from '@/components/leads/lead-invoices';

describe('LeadInvoices', () => {
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
                                uuid: '0199a9a0-0000-7000-8000-000000000109',
                                number: 'RP-27009',
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

    it('lists the invoices with amount and status, and links to create a prefilled one', () => {
        render(
            <LeadInvoices
                leadId={7}
                leadUuid="0199a9a0-0000-7000-8000-000000000007"
                canEdit
                invoices={[
                    {
                        id: 3,
                        uuid: '0199a9a0-0000-7000-8000-000000000103',
                        number: 'RP-27003',
                        client_name: 'Nestlé',
                        amount_cents: 128_639,
                        currency: 'EUR',
                        status: 'sent',
                        status_label: 'Envoyée',
                        issued_at: '2026-09-04',
                    },
                ]}
            />,
        );

        expect(screen.getByRole('link', { name: /RP-27003/ })).toHaveAttribute(
            'href',
            '/invoices/0199a9a0-0000-7000-8000-000000000103',
        );
        expect(screen.getByText('Envoyée')).toBeInTheDocument();
        expect(screen.getByText(/1.286,39/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Créer une facture' }),
        ).toHaveAttribute(
            'href',
            '/invoices/create?lead=0199a9a0-0000-7000-8000-000000000007',
        );
    });

    it('searches existing invoices and links one to the lead', async () => {
        const user = userEvent.setup();
        render(
            <LeadInvoices
                leadId={7}
                leadUuid="0199a9a0-0000-7000-8000-000000000007"
                canEdit
                invoices={[]}
            />,
        );

        expect(
            screen.getByText('Aucune facture pour ce lead.'),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Lier une facture existante' }),
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Numéro ou client de la facture…',
            ),
            'nes',
        );
        await user.click(await screen.findByText('RP-27009 · Nestlé'));

        await waitFor(() =>
            expect(patch).toHaveBeenCalledWith(
                '/invoices/0199a9a0-0000-7000-8000-000000000109/lead',
                { lead_id: 7 },
                expect.anything(),
            ),
        );
    });

    it('is read-only for members', () => {
        render(
            <LeadInvoices
                leadId={7}
                leadUuid="0199a9a0-0000-7000-8000-000000000007"
                canEdit={false}
                invoices={[]}
            />,
        );

        expect(
            screen.queryByRole('link', { name: 'Créer une facture' }),
        ).not.toBeInTheDocument();
    });
});
