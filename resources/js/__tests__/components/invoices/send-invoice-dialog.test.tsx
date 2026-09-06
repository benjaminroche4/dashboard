import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { post },
}));

import { SendInvoiceDialog } from '@/components/invoices/send-invoice-dialog';

type Options = {
    onError?: (errors: Record<string, string>) => void;
    onSuccess?: () => void;
    onFinish?: () => void;
};

describe('SendInvoiceDialog', () => {
    it('shows the recipient and posts to the send route on confirmation', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        post.mockImplementation(
            (_url: string, _data: object, options: Options) => {
                options.onSuccess?.();
                options.onFinish?.();
            },
        );

        render(
            <SendInvoiceDialog
                invoiceId={7}
                invoiceNumber="RP-27007"
                clientEmail="client@exemple.com"
                open
                onOpenChange={onOpenChange}
            />,
        );

        expect(
            screen.getByRole('dialog', { name: 'Envoyer RP-27007 au client' }),
        ).toBeInTheDocument();
        expect(screen.getByText('client@exemple.com')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: "Confirmer l'envoi" }),
        );

        expect(post).toHaveBeenCalledWith(
            '/invoices/7/send',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('displays the server error and keeps the dialog open', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        post.mockImplementation(
            (_url: string, _data: object, options: Options) => {
                options.onError?.({
                    status: 'Cette facture ne peut pas être envoyée.',
                });
                options.onFinish?.();
            },
        );

        render(
            <SendInvoiceDialog
                invoiceId={7}
                invoiceNumber="RP-27007"
                clientEmail="client@exemple.com"
                open
                onOpenChange={onOpenChange}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: "Confirmer l'envoi" }),
        );

        expect(
            screen.getByText('Cette facture ne peut pas être envoyée.'),
        ).toBeInTheDocument();
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it('closes on cancel without posting', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        post.mockReset();

        render(
            <SendInvoiceDialog
                invoiceId={7}
                invoiceNumber="RP-27007"
                clientEmail={null}
                open
                onOpenChange={onOpenChange}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Annuler' }));

        expect(post).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
