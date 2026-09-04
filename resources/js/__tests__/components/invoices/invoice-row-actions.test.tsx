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
        ).toHaveAttribute('href', '/invoices/1');
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
});
