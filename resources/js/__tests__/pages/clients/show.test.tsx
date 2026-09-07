import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
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
}));

import ClientShow from '@/pages/clients/show';
import { makeClientDetail } from '@/test/fixtures/client';

describe('Client file page', () => {
    it('shows the client, the money figures, the project, the dossier sections and the actions', () => {
        render(
            <ClientShow
                client={makeClientDetail()}
                totals={[
                    {
                        currency: 'EUR',
                        invoiced_cents: 219_000,
                        paid_cents: 100_000,
                        due_cents: 119_000,
                    },
                ]}
                invoices={[
                    {
                        id: 1,
                        uuid: 'inv-1',
                        number: 'RP-27001',
                        client_name: 'Nestlé',
                        amount_cents: 219_000,
                        currency: 'EUR',
                        status: 'sent',
                        status_label: 'Envoyée',
                        issued_at: '2026-09-01',
                    },
                ]}
                quotes={[]}
                documentRequests={[]}
                partners={[
                    {
                        id: 1,
                        role: 'guarantee',
                        role_label: 'Garantie',
                        note: 'Dossier envoyé',
                        partner: {
                            id: 1,
                            uuid: 'p1',
                            name: 'Garantme',
                            type: 'partnership',
                            type_label: 'Partenariat',
                            email: null,
                            phone: null,
                            contacts: [],
                        },
                    },
                ]}
                notes={[
                    {
                        id: 1,
                        body: 'Visite prévue lundi.',
                        by: 'Admin',
                        avatar: null,
                        at: '2026-09-07T09:00:00+00:00',
                    },
                ]}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Léa Durand',
        );
        expect(
            screen.getByText(
                /LD-4821 · Nestlé · client depuis le 01 sept\. 2026/,
            ),
        ).toBeInTheDocument();
        const stats = within(
            screen.getByRole('region', { name: 'Chiffres du dossier' }),
        );
        expect(stats.getByText(/2.190,00 €/)).toBeInTheDocument();
        expect(stats.getByText(/1.190,00 €/)).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('region', { name: 'Projet de logement' }),
            ).getByText('3e, 4e, 11e'),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /RP-27001/ })).toHaveAttribute(
            'href',
            '/invoices/inv-1',
        );
        expect(
            screen.getByText('Aucun devis pour ce lead.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Garantme')).toBeInTheDocument();
        expect(
            screen.getByText('Garantie · Dossier envoyé'),
        ).toBeInTheDocument();
        expect(screen.getByText('Visite prévue lundi.')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Fiche lead/ }),
        ).toHaveAttribute(
            'href',
            '/leads/0199a9a0-0000-7000-8000-0000000000e1',
        );
        expect(
            screen.getByRole('link', { name: /Nouvelle facture/ }),
        ).toHaveAttribute(
            'href',
            '/invoices/create?lead=0199a9a0-0000-7000-8000-0000000000e1',
        );
        expect(
            screen.getByRole('link', { name: /Nouveau devis/ }),
        ).toHaveAttribute(
            'href',
            '/tools/quotes/create?lead=0199a9a0-0000-7000-8000-0000000000e1',
        );
    });

    it('shows dashes without invoices and the empty states', () => {
        render(
            <ClientShow
                client={makeClientDetail({
                    assignee: null,
                    message: null,
                    districts: [],
                })}
                totals={[]}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
            />,
        );

        expect(screen.getByText(/non attribué/)).toBeInTheDocument();
        expect(
            screen.getByText('Aucun partenaire sur ce dossier.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Aucune note.')).toBeInTheDocument();
        expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(0);
    });
});
