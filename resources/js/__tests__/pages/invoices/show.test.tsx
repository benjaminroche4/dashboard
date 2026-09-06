import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { post, patch: vi.fn() },
    usePage: () => ({
        props: { auth: { user: { id: 1, name: 'Admin', role: 'admin' } } },
    }),
}));

import InvoicesShow from '@/pages/invoices/show';
import { makeInvoiceDetail, makeStatusChange } from '@/test/fixtures/invoice';

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

describe('Invoice detail page', () => {
    it('shows the number, status, preview and history', () => {
        render(
            <InvoicesShow
                invoice={makeInvoiceDetail()}
                history={[
                    makeStatusChange(),
                    makeStatusChange({
                        id: 2,
                        from: 'Brouillon',
                        to: 'Envoyée',
                        to_status: 'sent',
                        note: null,
                    }),
                ]}
                company={company}
                offers={offers}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Facture RP-27001',
        );
        expect(
            screen.getByRole('heading', { level: 1 }).parentElement,
        ).toHaveTextContent('Envoyée');
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        const history = within(screen.getByRole('list'));
        expect(history.getAllByRole('listitem')).toHaveLength(2);
        expect(history.getByText('(depuis Brouillon)')).toBeInTheDocument();
        expect(history.getByText('Création')).toBeInTheDocument();
        expect(
            within(screen.getByLabelText('Aperçu de la facture')).getByText(
                'Jean Dupont',
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
        expect(screen.getByText('créée par')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getAllByText('4 septembre 2026').length).toBeGreaterThan(
            0,
        );
        expect(
            screen.queryByRole('link', { name: /Retour à la liste/ }),
        ).not.toBeInTheDocument();
    });

    it('offers to send a draft and posts to the send route after confirmation', async () => {
        const user = userEvent.setup();
        render(
            <InvoicesShow
                invoice={makeInvoiceDetail({
                    status: 'draft',
                    status_label: 'Brouillon',
                    can_send: true,
                    can_pay: false,
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
        expect(
            screen.getByRole('dialog', { name: 'Envoyer RP-27001 au client' }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: "Confirmer l'envoi" }),
        );

        expect(post).toHaveBeenCalledWith(
            '/invoices/1/send',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            screen.queryByRole('button', { name: 'Marquer payée' }),
        ).not.toBeInTheDocument();
    });

    it('opens the payment dialog and posts the payment date', async () => {
        const user = userEvent.setup();
        render(
            <InvoicesShow
                invoice={makeInvoiceDetail()}
                history={[]}
                company={company}
                offers={offers}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Marquer payée' }));
        const dialog = within(await screen.findByRole('dialog'));
        expect(dialog.getByLabelText('Date de paiement')).toBeInTheDocument();

        await user.click(
            dialog.getByRole('button', { name: 'Confirmer le paiement' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/invoices/1/pay',
            { paid_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
