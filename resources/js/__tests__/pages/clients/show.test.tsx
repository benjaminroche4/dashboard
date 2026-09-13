import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { routerPatch } = vi.hoisted(() => ({ routerPatch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { patch: routerPatch },
    usePage: () => ({
        props: {
            auth: { user: { role: 'admin' } },
            staff: [{ id: 2, name: 'Charles Petit', functions: ['Closing'] }],
        },
    }),
    useForm: () => ({
        // Les personnes du dossier et le compositeur de notes passent tous
        // deux par `useForm` : le stub porte donc leurs champs.
        data: {
            co_first_name: '',
            co_last_name: '',
            co_email: '',
            co_phone: '',
            co_assigned_to: '',
            body: '',
        },
        errors: {},
        processing: false,
        setData: vi.fn(),
        clearErrors: vi.fn(),
        reset: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    }),
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
import {
    clientPriorities,
    makeClientDetail,
    makeDossierReadiness,
} from '@/test/fixtures/client';
import { makeActivity } from '@/test/fixtures/activity';
import { makeVisit } from '@/test/fixtures/visit';

describe('Client file page', () => {
    it('says on the overview whether the dossier is ready to be presented', () => {
        render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail()}
                readiness={makeDossierReadiness({
                    status: 'incomplete',
                    status_label: 'Incomplet',
                    total: 6,
                    accepted: 3,
                    to_check: 1,
                    refused: 1,
                    missing: 1,
                    percent: 50,
                })}
                totals={[]}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
            />,
        );

        const section = within(
            screen.getByRole('region', { name: 'Dossier de location' }),
        );

        expect(section.getByText('Incomplet')).toBeInTheDocument();
        expect(section.getByText('3/6 pièces validées')).toBeInTheDocument();
    });

    it('shows the client, where the search stands, the project, the dossier tabs and the actions', async () => {
        const user = userEvent.setup();
        render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail()}
                progress={{
                    visits_done: 3,
                    properties_refused: 2,
                    applications: 1,
                }}
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
                suggestedProperties={[
                    {
                        id: 9,
                        uuid: 'prop-9',
                        label: 'T3 meublé · 100 m² · 1er',
                        street: '12 rue de Richelieu',
                        postal_code: '75001',
                        city: 'Paris',
                        property_type_label: 'T3',
                        furnished_label: 'Meublé',
                        surface_m2: 100,
                        rent_cents: 60_200,
                        currency: 'EUR',
                        listing_url: null,
                        agent: null,
                        score: 8,
                        reasons: ['Dans le budget'],
                    },
                ]}
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
                        uuid: 'note-1',
                        body: 'Visite prévue lundi.',
                        kind: 'team',
                        by: 'Admin',
                        avatar: null,
                        mine: false,
                        can_edit: false,
                        can_delete: false,
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
        // Le dossier dit où en est la recherche, pas la facturation : elle a
        // ses propres sections.
        expect(stats.getByText('Visites réalisées')).toBeInTheDocument();
        expect(stats.getByText('3')).toBeInTheDocument();
        expect(stats.getByText('Biens refusés')).toBeInTheDocument();
        expect(stats.getByText('2')).toBeInTheDocument();
        expect(stats.queryByText('Facturé')).not.toBeInTheDocument();
        expect(
            within(
                screen.getByRole('region', { name: 'Projet de logement' }),
            ).getByText('3e, 4e, 11e'),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole('tab').map((tab) => tab.textContent),
        ).toEqual([
            'Aperçu',
            'Personnes2',
            'Visites1',
            // Un compteur à zéro ne s'affiche pas : il n'apprend rien.
            'Documents',
            // Un seul badge par onglet : les biens du dossier. Les biens
            // suggérés se comptent dans l'onglet, pas sur sa pastille.
            'Biens',
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
        // La carte « Partenaires du dossier » est celle de la fiche lead :
        // le rôle, la note, et de quoi en ajouter un depuis le dossier.
        const partnerCard = within(
            screen.getByRole('region', { name: 'Partenaires du dossier' }),
        );
        expect(partnerCard.getByText('Garantie')).toBeInTheDocument();
        expect(partnerCard.getByText('Dossier envoyé')).toBeInTheDocument();
        expect(
            partnerCard.getByRole('button', { name: 'Ajouter' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /Notes/ }));
        expect(screen.getByText('Visite prévue lundi.')).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /Visites/ }));
        expect(screen.getByText('T2 lumineux · 11e')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Planifier une visite/ }),
        ).toBeInTheDocument();

        // La barre d'avancement remplace la date d'arrivée en chiffre.
        expect(screen.getByRole('progressbar')).toBeInTheDocument();

        // Les actions secondaires vivent dans le menu « ⋯ » de l'en-tête.
        await user.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        expect(
            await screen.findByRole('menuitem', { name: /Fiche lead/ }),
        ).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-0000000000e1',
        );
        expect(
            screen.getByRole('menuitem', { name: /Planifier une visite/ }),
        ).toHaveAttribute(
            'href',
            '/clients/visits/create?client=0199a9a0-0000-7000-8000-0000000000e1',
        );
        expect(
            screen.getByRole('menuitem', { name: /Nouveau devis/ }),
        ).toHaveAttribute(
            'href',
            '/tools/quotes/create?lead=0199a9a0-0000-7000-8000-0000000000e1',
        );
        expect(
            screen.getByRole('menuitem', { name: /Nouvelle facture/ }),
        ).toHaveAttribute(
            'href',
            '/invoices/create?lead=0199a9a0-0000-7000-8000-0000000000e1',
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
            screen.getByText(
                'Aucun partenaire dans l’annuaire pour le moment.',
            ),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /Visites/ }));
        expect(
            screen.getByText('Aucune visite pour ce client.'),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /Notes/ }));
        // Fil vide, mais la note s'écrit tout de suite : même compositeur que
        // la fiche lead.
        expect(
            screen.getByText('Aucune activité pour le moment.'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Nouvelle note' }),
        ).toBeInTheDocument();
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

    it('changes who follows the file from the header', async () => {
        const user = userEvent.setup();
        render(
            <ClientShow
                client={makeClientDetail()}
                priorities={clientPriorities}
                totals={[]}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: /Suivi par Admin, changer/ }),
        );
        await user.click(
            screen.getByRole('menuitem', { name: /Charles Petit/ }),
        );

        expect(routerPatch).toHaveBeenCalledWith(
            expect.stringContaining('/assign'),
            { user_id: 2 },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('groups the people of the dossier in their own tab', async () => {
        const user = userEvent.setup();
        render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail({
                    name: 'Bruno & Charles',
                    co_tenant: {
                        first_name: 'Charles',
                        last_name: 'Mata',
                        name: 'Charles Mata',
                        email: 'charles@example.com',
                        phone: '+33 6 12 34 56 78',
                        income_cents: 250_000,
                    },
                    co_assignee: { id: 2, name: 'Charles Petit', avatar: null },
                })}
                guarantors={[
                    {
                        uuid: 'guarantor-1',
                        first_name: 'Marie',
                        last_name: 'Mata',
                        name: 'Marie Mata',
                        email: null,
                        phone: null,
                        employment_status: 'cdi',
                        employment_status_label: 'CDI',
                        occupation: 'Infirmière',
                        income_cents: 450_000,
                        note: null,
                    },
                ]}
                watchers={[
                    {
                        uuid: 'watcher-1',
                        name: 'Claire Martin',
                        email: 'claire.martin@exemple.com',
                        phone: '+33 6 11 22 33 44',
                        role: 'Mère du locataire',
                    },
                ]}
                totals={[]}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
            />,
        );

        await user.click(screen.getByRole('tab', { name: /Personnes/ }));

        const tenants = within(
            screen.getByRole('region', { name: 'Locataires' }),
        );
        expect(tenants.getByText('Bruno & Charles')).toBeInTheDocument();
        expect(tenants.getByText('Charles Mata')).toBeInTheDocument();
        expect(tenants.getByText('charles@example.com')).toBeInTheDocument();

        expect(
            within(screen.getByRole('region', { name: 'Garants' })).getByText(
                'Marie Mata',
            ),
        ).toBeInTheDocument();

        // Les personnes de suivi sont des gens à qui on met une adresse : un
        // nom, le lien avec le client, l'e-mail. Pas des membres de l'équipe.
        const watchers = within(
            screen.getByRole('region', { name: 'Personnes de suivi' }),
        );
        expect(watchers.getByText('Claire Martin')).toBeInTheDocument();
        expect(watchers.getByText('Mère du locataire')).toBeInTheDocument();
        expect(
            watchers.getByText('claire.martin@exemple.com').closest('a'),
        ).toHaveAttribute('href', 'mailto:claire.martin@exemple.com');
        expect(watchers.getByText('+33 6 11 22 33 44')).toBeInTheDocument();
        expect(watchers.queryByText('Charles Petit')).toBeNull();

        // Le garant dit ce qu'il fait dans la vie, pas seulement son revenu.
        expect(
            within(screen.getByRole('region', { name: 'Garants' })).getByText(
                /Infirmière/,
            ),
        ).toBeInTheDocument();
    });

    it('presents each person as a card, on the mould of an invoice line', async () => {
        const user = userEvent.setup();
        render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail({ name: 'Bruno Mata' })}
                guarantors={[
                    {
                        uuid: 'guarantor-1',
                        first_name: 'Marie',
                        last_name: 'Mata',
                        name: 'Marie Mata',
                        email: null,
                        phone: null,
                        employment_status: 'cdi',
                        employment_status_label: 'CDI',
                        occupation: 'Infirmière',
                        income_cents: 450_000,
                        note: null,
                    },
                ]}
                totals={[]}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
            />,
        );

        await user.click(screen.getByRole('tab', { name: /Personnes/ }));

        const guarantors = within(
            screen.getByRole('region', { name: 'Garants' }),
        );

        // Le bandeau dit ce que la personne est ici ; le métier passe sous le
        // nom, et le revenu se lit à droite comme un total de ligne.
        expect(guarantors.getByText('Garant 1')).toBeInTheDocument();
        expect(guarantors.getByText('Infirmière')).toBeInTheDocument();
        expect(guarantors.getByText('Revenu mensuel')).toBeInTheDocument();
        expect(guarantors.getByText(/4.500,00/)).toBeInTheDocument();

        expect(
            within(
                screen.getByRole('region', { name: 'Locataires' }),
            ).getByText('Locataire'),
        ).toBeInTheDocument();
    });

    it('takes a note from the overview and manages agent and partners from the file', async () => {
        const user = userEvent.setup();
        render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail()}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                agents={[
                    {
                        id: 1,
                        uuid: 'agent-1',
                        name: 'Zoé Martin',
                        agency: 'Agence du Marais',
                        phone: null,
                        is_favorite: false,
                    },
                ]}
                partnerOptions={[
                    {
                        id: 1,
                        name: 'Garantme',
                        type: 'partnership',
                        type_label: 'Partenariat',
                    },
                ]}
                partnerRoles={[{ value: 'guarantee', label: 'Garantie' }]}
                notes={[]}
            />,
        );

        // Aperçu : le bouton ouvre le compositeur, sans changer d'onglet.
        await user.click(
            screen.getByRole('button', { name: 'Ajouter une note' }),
        );
        expect(
            await screen.findByRole('textbox', { name: 'Nouvelle note' }),
        ).toBeInTheDocument();

        // Onglet « Autre » : l'agent et les partenaires se gèrent ici.
        await user.click(screen.getByRole('tab', { name: /Autre/ }));
        expect(
            screen.getByRole('region', { name: 'Agent en contact' }),
        ).toBeInTheDocument();
        const partnerCard = within(
            screen.getByRole('region', { name: 'Partenaires du dossier' }),
        );
        expect(
            partnerCard.getByRole('button', { name: 'Ajouter' }),
        ).toBeEnabled();
    });

    it('tints the offer badge in the header, like everywhere else', () => {
        const { unmount } = render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail({
                    offer: 'accompagne',
                    offer_label: 'Accompagné',
                })}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
            />,
        );
        // Accompagné en jaune, Confié en bleu : la même lecture partout.
        expect(screen.getByText('Accompagné').className).toContain('amber');
        unmount();

        render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail({
                    offer: 'confie',
                    offer_label: 'Confié',
                })}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
            />,
        );
        expect(screen.getByText('Confié').className).toContain('blue');
    });

    it('explains that a refused property is the client’s own refusal', () => {
        render(
            <ClientShow
                priorities={clientPriorities}
                client={makeClientDetail()}
                progress={{
                    visits_done: 1,
                    properties_refused: 1,
                    applications: 0,
                }}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
                partners={[]}
                notes={[]}
            />,
        );

        // « Refusés » se lit de travers : c'est le client qui écarte, pas
        // l'agence qui recale.
        expect(
            screen.getByLabelText(
                /^Biens refusés : Les logements que le client/,
            ),
        ).toBeInTheDocument();
    });
});
