import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { SendQuoteDialog } from '@/components/quotes/send-quote-dialog';

type Options = {
    onError?: (errors: Record<string, string>) => void;
    onSuccess?: () => void;
    onFinish?: () => void;
};

describe('SendQuoteDialog', () => {
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
            <SendQuoteDialog
                quoteUuid="0199a9a0-0000-7000-8000-00000000d001"
                quoteNumber="DV-27007"
                clientEmail="client@exemple.com"
                open
                onOpenChange={onOpenChange}
            />,
        );

        expect(
            screen.getByRole('dialog', { name: 'Envoyer DV-27007 au client' }),
        ).toBeInTheDocument();
        expect(screen.getByText('client@exemple.com')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: "Confirmer l'envoi" }),
        );

        expect(post).toHaveBeenCalledWith(
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001/send',
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
                    client_email: 'Ajoutez un e-mail client.',
                });
                options.onFinish?.();
            },
        );

        render(
            <SendQuoteDialog
                quoteUuid="0199a9a0-0000-7000-8000-00000000d001"
                quoteNumber="DV-27007"
                clientEmail={null}
                open
                onOpenChange={onOpenChange}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: "Confirmer l'envoi" }),
        );

        expect(
            screen.getByText('Ajoutez un e-mail client.'),
        ).toBeInTheDocument();
        expect(onOpenChange).not.toHaveBeenCalled();
    });
});
