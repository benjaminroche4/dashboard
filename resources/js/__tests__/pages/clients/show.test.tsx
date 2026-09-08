import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
    Link: ({
        href,
        children,
        prefetch: _prefetch,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
        prefetch?: boolean;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import ClientShow from '@/pages/clients/show';
import { clientPriorities, makeClientDetail } from '@/test/fixtures/client';
import { makeActivity } from '@/test/fixtures/activity';
import { makeVisit } from '@/test/fixtures/visit';

describe('Client file page', () => {
    it('shows the client, the money figures, the project, the dossier tabs and the actions', async () => {
        const user = userEvent.setup();
        render(
            <ClientShow
                priorities={clientPriorities}
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
                visits={[makeVisit()]}
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
            screen
                .getByTestId('dossier-folder')
                .querySelector('img[src="/images/folder/front.svg"]'),
        ).not.toBeNull();
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
        expect(
            screen.getAllByRole('tab').map((tab) => tab.textContent),
        ).toEqual([
            'Aperçu',
            'Visites1',
            'Documents0',
            'Biens0',
            'Notes1',
            'Autre2',
        ]);
        expect(
            screen.queryByRole('link', { name: /RP-27001/ }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: /Autre/ }));
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
        await user.click(screen.getByRole('tab', { name: /Notes/ }));
        expect(screen.getByText('Visite prévue lundi.')).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /Visites/ }));
        expect(screen.getByText('T2 lumineux · 11e')).toBeInTheDocument();
        expect(
            screen.getAllByRole('link', { name: /Planifier une visite/ }),
        ).toHaveLength(2);
        expect(
            screen.getByRole('link', { name: /Fiche lead/ }),
        ).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-0000000000e1',
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

    it('shows dashes without invoices and the empty states', async () => {
        const user = userEvent.setup();
        render(
            <ClientShow
                priorities={clientPriorities}
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
        expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(0);
        await user.click(screen.getByRole('tab', { name: /Autre/ }));
        expect(
            screen.getByText('Aucun partenaire sur ce dossier.'),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /Visites/ }));
        expect(
            screen.getByText('Aucune visite pour ce client.'),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /Notes/ }));
        expect(screen.getByText('Aucune note.')).toBeInTheDocument();
    });

    it('lists the journal of the dossier with a link to the full log', async () => {
        const user = userEvent.setup();
        render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail()}
                totals={[]}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
                activities={[
                    makeActivity({
                        message: 'a rattaché le bien Rue Oberkampf au dossier',
                        resource_label: 'Dossiers',
                    }),
                    makeActivity({
                        id: 2,
                        actor: null,
                        message: 'a reçu un appel',
                    }),
                ]}
            />,
        );

        await user.click(screen.getByRole('tab', { name: /Notes/ }));
        const journal = screen.getByRole('region', { name: 'Journal' });
        expect(journal).toHaveTextContent(
            'Admin a rattaché le bien Rue Oberkampf au dossier',
        );
        expect(journal).toHaveTextContent('Le système a reçu un appel');
        expect(journal).toHaveTextContent('Dossiers ·');
        expect(
            within(journal).getByRole('link', { name: 'Tout le journal' }),
        ).toHaveAttribute(
            'href',
            '/tools/activity?lead=0199a9a0-0000-7000-8000-0000000000e1',
        );
    });
});
