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

import { QuoteRowActions } from '@/components/quotes/quote-row-actions';
import { makeQuote } from '@/test/fixtures/quote';

describe('QuoteRowActions', () => {
    it('links to the detail page and the invoice, disables forbidden transitions and posts the allowed ones', async () => {
        const user = userEvent.setup();
        render(
            <QuoteRowActions
                quote={makeQuote({
                    can_send: false,
                    can_accept: true,
                    invoice: {
                        id: 9,
                        uuid: '0199a9a0-0000-7000-8000-000000000109',
                        number: 'RP-27009',
                    },
                })}
                canManage
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions pour DV-27001' }),
        );

        expect(
            await screen.findByRole('menuitem', { name: 'Voir le devis' }),
        ).toHaveAttribute(
            'href',
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Voir la facture RP-27009' }),
        ).toHaveAttribute(
            'href',
            '/invoices/0199a9a0-0000-7000-8000-000000000109',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Envoyer au client' }),
        ).toHaveAttribute('aria-disabled', 'true');

        await user.click(
            screen.getByRole('menuitem', { name: 'Marquer accepté' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001/accept',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('opens the decline dialog and hides the status actions from members', async () => {
        const user = userEvent.setup();
        const { unmount } = render(
            <QuoteRowActions quote={makeQuote()} canManage />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions pour DV-27001' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Marquer refusé' }),
        );
        expect(await screen.findByRole('dialog')).toHaveTextContent(
            'Marquer DV-27001 refusé',
        );
        unmount();

        render(<QuoteRowActions quote={makeQuote()} canManage={false} />);
        await user.click(
            screen.getByRole('button', { name: 'Actions pour DV-27001' }),
        );
        expect(
            await screen.findByRole('menuitem', { name: 'Télécharger le PDF' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: 'Créer la facture' }),
        ).toBeNull();
    });
});
