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

import { InvoiceLeadLink } from '@/components/invoices/invoice-lead-link';

describe('InvoiceLeadLink', () => {
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
                                id: 7,
                                uuid: '0199a9a0-0000-7000-8000-000000000007',
                                name: 'Léa Durand',
                                email: 'lea@example.com',
                            },
                        ]),
                }),
            ),
        );
    });

    it('shows the linked lead with a link to its page and lets a manager unlink it', async () => {
        const user = userEvent.setup();
        render(
            <InvoiceLeadLink
                invoiceUuid="0199a9a0-0000-7000-8000-000000000103"
                lead={{
                    id: 7,
                    uuid: '0199a9a0-0000-7000-8000-000000000007',
                    name: 'Léa Durand',
                    is_client: false,
                }}
                canEdit
            />,
        );

        expect(
            screen.getByRole('link', { name: /Léa Durand/ }),
        ).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-000000000007',
        );
        await user.click(screen.getByRole('button', { name: 'Détacher' }));

        expect(patch).toHaveBeenCalledWith(
            '/invoices/0199a9a0-0000-7000-8000-000000000103/lead',
            { lead_id: null },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('searches leads and links the chosen one', async () => {
        const user = userEvent.setup();
        render(
            <InvoiceLeadLink
                invoiceUuid="0199a9a0-0000-7000-8000-000000000103"
                lead={null}
                canEdit
            />,
        );

        expect(
            screen.getByText('Aucun lead ni dossier client rattaché.'),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Lier à un lead ou un client' }),
        );
        await user.type(
            await screen.findByPlaceholderText('Nom, e-mail ou téléphone…'),
            'lea',
        );

        await user.click(await screen.findByText('Léa Durand'));
        await waitFor(() =>
            expect(patch).toHaveBeenCalledWith(
                '/invoices/0199a9a0-0000-7000-8000-000000000103/lead',
                { lead_id: 7 },
                expect.anything(),
            ),
        );
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/locataires/search?q=lea'),
            expect.anything(),
        );
    });

    it('hides the actions for members', () => {
        render(
            <InvoiceLeadLink
                invoiceUuid="0199a9a0-0000-7000-8000-000000000103"
                lead={null}
                canEdit={false}
            />,
        );

        expect(
            screen.queryByRole('button', {
                name: 'Lier à un lead ou un client',
            }),
        ).not.toBeInTheDocument();
    });
});
