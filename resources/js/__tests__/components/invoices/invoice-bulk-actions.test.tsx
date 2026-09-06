import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { InvoiceBulkActions } from '@/components/invoices/invoice-bulk-actions';
import { makeInvoice } from '@/test/fixtures/invoice';

const invoices = [
    makeInvoice({ id: 1, can_send: true, can_pay: false }),
    makeInvoice({ id: 2, can_send: false, can_pay: true }),
    makeInvoice({ id: 3, can_send: false, can_pay: true }),
];

describe('InvoiceBulkActions', () => {
    beforeEach(() => post.mockClear());

    it('counts the sendable and payable invoices on each button', () => {
        render(<InvoiceBulkActions invoices={invoices} onDone={vi.fn()} />);

        expect(
            screen.getByRole('button', { name: /Envoyer \(1\)/ }),
        ).toBeEnabled();
        expect(
            screen.getByRole('button', { name: /Marquer payées \(2\)/ }),
        ).toBeEnabled();
    });

    it('disables a button when nothing is eligible', () => {
        render(
            <InvoiceBulkActions
                invoices={[makeInvoice({ can_send: false, can_pay: false })]}
                onDone={vi.fn()}
            />,
        );

        expect(
            screen.getByRole('button', { name: /Envoyer \(0\)/ }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: /Marquer payées \(0\)/ }),
        ).toBeDisabled();
    });

    it('posts the sendable ids and clears the selection on success', async () => {
        const user = userEvent.setup();
        const onDone = vi.fn();
        post.mockImplementation((...args: unknown[]) =>
            (args[2] as { onSuccess?: () => void } | undefined)?.onSuccess?.(),
        );
        render(<InvoiceBulkActions invoices={invoices} onDone={onDone} />);

        await user.click(screen.getByRole('button', { name: /Envoyer \(1\)/ }));

        expect(post).toHaveBeenCalledWith(
            '/invoices/bulk/send',
            { ids: [1] },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('asks for the payment date then posts the payable ids', async () => {
        const user = userEvent.setup();
        const onDone = vi.fn();
        post.mockImplementation((...args: unknown[]) =>
            (args[2] as { onSuccess?: () => void } | undefined)?.onSuccess?.(),
        );
        render(<InvoiceBulkActions invoices={invoices} onDone={onDone} />);

        await user.click(
            screen.getByRole('button', { name: /Marquer payées \(2\)/ }),
        );
        expect(
            screen.getByRole('heading', {
                name: 'Marquer 2 facture(s) comme payée(s)',
            }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Confirmer le paiement' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/invoices/bulk/pay',
            expect.objectContaining({ ids: [2, 3] }),
            expect.anything(),
        );
        expect(onDone).toHaveBeenCalledOnce();
    });
});
