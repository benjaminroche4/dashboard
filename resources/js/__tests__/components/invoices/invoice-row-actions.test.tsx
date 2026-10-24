import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
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
    router: { post },
}));

import { InvoiceRowActions } from '@/components/invoices/invoice-row-actions';
import { makeInvoice } from '@/test/fixtures/invoice';

describe('InvoiceRowActions', () => {
    it('links to the detail page and the PDF, and disables forbidden transitions', async () => {
        const user = userEvent.setup();
        render(
            <InvoiceRowActions
                invoice={makeInvoice({ can_send: false, can_pay: true })}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions pour RP-27001' }),
        );

        expect(
            await screen.findByRole('menuitem', { name: 'Voir la facture' }),
        ).toHaveAttribute(
            'href',
            '/invoices/0199a9a0-0000-7000-8000-000000000101',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Télécharger le PDF' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: 'Envoyer au client' }),
        ).toHaveAttribute('aria-disabled', 'true');

        await user.click(
            screen.getByRole('menuitem', { name: 'Marquer comme payée' }),
        );

        expect(await screen.findByRole('dialog')).toHaveTextContent(
            'Marquer RP-27001 comme payée',
        );
    });

    it('offers the quote conversion to managers only and links an existing quote', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <InvoiceRowActions invoice={makeInvoice({ can_quote: true })} />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions pour RP-27001' }),
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Transformer en devis' }),
        ).not.toBeInTheDocument();
        await user.keyboard('{Escape}');

        rerender(
            <InvoiceRowActions
                invoice={makeInvoice({
                    can_quote: false,
                    quote: { id: 7, uuid: 'q-uuid', number: 'DV-27007' },
                })}
                canManage
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Actions pour RP-27001' }),
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Transformer en devis' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: 'Voir le devis DV-27007' }),
        ).toHaveAttribute('href', '/tools/quotes/q-uuid');
        await user.keyboard('{Escape}');

        rerender(
            <InvoiceRowActions
                invoice={makeInvoice({ can_quote: true })}
                canManage
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Actions pour RP-27001' }),
        );
        await user.click(
            screen.getByRole('menuitem', { name: 'Transformer en devis' }),
        );
        expect(
            screen.getByRole('dialog', {
                name: 'Transformer RP-27001 en devis',
            }),
        ).toBeInTheDocument();
    });
});
