import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { post, role } = vi.hoisted(() => ({
    post: vi.fn(),
    role: { value: 'admin' },
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { post },
    usePage: () => ({
        props: { auth: { user: { id: 1, name: 'Admin', role: role.value } } },
    }),
}));

import QuotesShow from '@/pages/quotes/show';
import { makeQuoteDetail, makeQuoteStatusChange } from '@/test/fixtures/quote';

const company = {
    name: 'Relocation In Paris',
    address: 'Rue des Alpes 5',
    email: 'contact@relocation-in-paris.com',
    phone: '+33',
    vat_number: '',
    iban: '',
    bank: '',
    default_vat_rate: 8.1,
    default_currency: 'EUR' as const,
    default_payment_terms_days: 30,
};
const offers = [
    {
        value: 'accompagne' as const,
        label: 'Accompagné',
        description: 'Offre Accompagné',
        prices: { CHF: 0, EUR: 119_000 },
    },
];

describe('Quote detail page', () => {
    it('shows the number, status, preview, links and history', () => {
        render(
            <QuotesShow
                quote={makeQuoteDetail({
                    lead: { id: 4, uuid: 'abc', name: 'Léa Durand' },
                    invoice: {
                        id: 9,
                        uuid: '0199a9a0-0000-7000-8000-000000000109',
                        number: 'RP-27009',
                    },
                    accepted_at: '2026-09-08T10:00:00+00:00',
                })}
                history={[
                    makeQuoteStatusChange(),
                    makeQuoteStatusChange({
                        id: 2,
                        from: 'Brouillon',
                        to: 'Envoyé',
                        to_status: 'sent',
                        note: null,
                    }),
                ]}
                company={company}
                offers={offers}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Devis DV-27001',
        );
        expect(
            screen.getByRole('heading', { level: 1 }).parentElement,
        ).toHaveTextContent('Envoyé');
        expect(
            screen.getByRole('heading', { level: 1 }).parentElement
                ?.parentElement,
        ).toHaveTextContent(/valable jusqu'au 07 oct\. 2026/);
        expect(screen.getByText('créé par')).toBeInTheDocument();
        const preview = within(screen.getByLabelText('Aperçu du devis'));
        expect(preview.getByText('Jean Dupont')).toBeInTheDocument();
        expect(preview.getByText('Adressé à')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/leads/abc');
        expect(screen.getByRole('link', { name: 'RP-27009' })).toHaveAttribute(
            'href',
            '/invoices/0199a9a0-0000-7000-8000-000000000109',
        );
        const history = within(screen.getByRole('list'));
        expect(history.getAllByRole('listitem')).toHaveLength(2);
        expect(history.getByText('(depuis Brouillon)')).toBeInTheDocument();
        expect(screen.getByText(/Accepté le/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    });

    it('offers to send a draft through the confirmation dialog', async () => {
        const user = userEvent.setup();
        render(
            <QuotesShow
                quote={makeQuoteDetail({
                    status: 'draft',
                    status_label: 'Brouillon',
                    can_send: true,
                    can_invoice: false,
                })}
                history={[]}
                company={company}
                offers={offers}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Envoyer au client' }),
        );
        expect(post).not.toHaveBeenCalled();
        await user.click(
            screen.getByRole('button', { name: "Confirmer l'envoi" }),
        );

        expect(post).toHaveBeenCalledWith(
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001/send',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.queryByRole('button', { name: 'Créer la facture' }),
        ).toBeNull();
    });

    it('accepts and invoices a sent quote in one click, and opens the decline dialog', async () => {
        const user = userEvent.setup();
        render(
            <QuotesShow
                quote={makeQuoteDetail()}
                history={[]}
                company={company}
                offers={offers}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Accepté' }));
        expect(post).toHaveBeenCalledWith(
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001/accept',
            {},
            expect.anything(),
        );

        await user.click(
            screen.getByRole('button', { name: 'Créer la facture' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001/invoice',
            {},
            expect.anything(),
        );

        await user.click(screen.getByRole('button', { name: 'Refusé' }));
        expect(await screen.findByRole('dialog')).toHaveTextContent(
            'Marquer DV-27001 refusé',
        );
    });

    it('hides every status action from members', () => {
        role.value = 'member';
        render(
            <QuotesShow
                quote={makeQuoteDetail()}
                history={[]}
                company={company}
                offers={offers}
            />,
        );

        expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Accepté' })).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Créer la facture' }),
        ).toBeNull();
        role.value = 'admin';
    });
});
