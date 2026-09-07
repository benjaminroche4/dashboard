import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { DeclineQuoteDialog } from '@/components/quotes/decline-quote-dialog';

type Options = {
    onError?: (errors: Record<string, string>) => void;
    onSuccess?: () => void;
    onFinish?: () => void;
};

describe('DeclineQuoteDialog', () => {
    it('posts the trimmed reason to the decline route and closes', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        post.mockImplementation(
            (_url: string, _data: object, options: Options) => {
                options.onSuccess?.();
                options.onFinish?.();
            },
        );

        render(
            <DeclineQuoteDialog
                quoteUuid="0199a9a0-0000-7000-8000-00000000d001"
                quoteNumber="DV-27005"
                open
                onOpenChange={onOpenChange}
            />,
        );

        expect(
            screen.getByRole('dialog', { name: 'Marquer DV-27005 refusé' }),
        ).toBeInTheDocument();
        await user.type(
            screen.getByLabelText('Motif (facultatif)'),
            '  Trop cher ',
        );
        await user.click(
            screen.getByRole('button', { name: 'Confirmer le refus' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001/decline',
            { reason: 'Trop cher' },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('sends null without reason and shows a server error', async () => {
        const user = userEvent.setup();
        post.mockImplementation(
            (_url: string, _data: object, options: Options) => {
                options.onError?.({ status: 'Transition impossible.' });
                options.onFinish?.();
            },
        );

        render(
            <DeclineQuoteDialog
                quoteUuid="0199a9a0-0000-7000-8000-00000000d001"
                quoteNumber="DV-27005"
                open
                onOpenChange={vi.fn()}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Confirmer le refus' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001/decline',
            { reason: null },
            expect.anything(),
        );
        expect(screen.getByText('Transition impossible.')).toBeInTheDocument();
    });
});
