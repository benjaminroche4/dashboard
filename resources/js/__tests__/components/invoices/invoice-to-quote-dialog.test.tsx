import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { post },
}));

import { InvoiceToQuoteDialog } from '@/components/invoices/invoice-to-quote-dialog';

describe('InvoiceToQuoteDialog', () => {
    it('explains the cancellation and posts to the quote route on confirmation', async () => {
        const user = userEvent.setup();
        render(
            <InvoiceToQuoteDialog
                invoiceUuid="0199a9a0-0000-7000-8000-000000000101"
                invoiceNumber="RP-27001"
                open
                onOpenChange={vi.fn()}
            />,
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Transformer RP-27001 en devis',
            }),
        ).toHaveTextContent('La facture passe en « Annulée »');

        await user.click(
            screen.getByRole('button', { name: 'Créer le devis' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/invoices/0199a9a0-0000-7000-8000-000000000101/quote',
            {},
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
    });
});
