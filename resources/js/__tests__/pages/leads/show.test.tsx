import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { post, patch, destroy } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    destroy: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
        className?: string;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
    router: { patch, delete: destroy, post },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Admin' } },
            staff: [
                { id: 1, name: 'Admin', role: 'admin', avatar: null },
                { id: 2, name: 'Admin 2', role: 'member', avatar: null },
            ],
        },
    }),
    useForm: (initial: { body: string }) => {
        const [data, setData] = useState(initial);

        return {
            data,
            errors: {},
            processing: false,
            setData: (key: 'body', value: string) => setData({ [key]: value }),
            reset: () => setData(initial),
            post,
        };
    },
}));

vi.mock('@/lib/toast', () => ({
    notify: {
        success: vi.fn(),
        info: vi.fn(),
        loading: vi.fn(),
        resolve: vi.fn(),
        reject: vi.fn(),
    },
}));

import LeadsShow from '@/pages/leads/show';
import {
    leadStatuses,
    lossReasons,
    makeLeadDetail,
    makeLeadPropertyDetail,
    makeInbound,
} from '@/test/fixtures/lead';
import type { LeadInvoice, LeadNote } from '@/types';

const leadInvoice = (id: number): LeadInvoice => ({
    id,
    uuid: `0199a9a0-0000-7000-8000-0000000001${String(id).padStart(2, '0')}`,
    number: `RP-2700${id}`,
    client_name: 'Nestlé',
    amount_cents: 128_639,
    currency: 'EUR',
    status: 'sent',
    status_label: 'Envoyée',
    issued_at: '2026-09-04',
});

const note = (overrides: Partial<LeadNote> = {}): LeadNote => ({
    id: 1,
    uuid: '0199a9a0-0000-7000-8000-0000000000c1',
    body: 'Rappeler mardi.',
    by: 'Admin',
    avatar: null,
    mine: true,
    can_edit: true,
    can_delete: true,
    at: '2026-09-04T10:00:00+00:00',
    ...overrides,
});

const base = {
    statuses: leadStatuses,
    sending: {
        email: true,
        paymentLink: true,
        contractLink: false,
        paymentPlans: [],
    },
    recontactChannels: [
        { value: 'phone' as const, label: 'Téléphone' },
        { value: 'whatsapp' as const, label: 'WhatsApp' },
    ],
    duplicates: [],
    inbound: null,
    agents: [],
    partners: [],
    partnerOptions: [],
    partnerRoles: [],
    can: { delete: false },
    invoices: [],
    quotes: [],
    documentRequests: [],
    lossReasons,
};

describe('Lead detail page', () => {
    it('shows the proposed property of an owner lead and edits it in the owner Converting Machine', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ segment: 'owner' })}
                property={makeLeadPropertyDetail()}
                notes={[]}
                history={[]}
            />,
        );

        const section = within(
            screen.getByRole('region', { name: 'Bien proposé' }),
        );
        expect(
            section.getByText('12 rue de Rivoli, 75004 Paris'),
        ).toBeInTheDocument();
        expect(section.getByText('Ascenseur')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Projet' })).toBeNull();
        expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
            'href',
            '/owners/leads/0199a9a0-0000-7000-8000-000000000001/edit',
        );
    });

    it('offers to complete an owner lead without a property yet', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ segment: 'owner' })}
                property={null}
                notes={[]}
                history={[]}
            />,
        );

        const section = within(
            screen.getByRole('region', { name: 'Bien proposé' }),
        );
        expect(section.getByText('Non renseigné')).toBeInTheDocument();
    });

    it('shows contact links, project facts, message, activity and reference', async () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                notes={[note()]}
                history={[
                    {
                        id: 1,
                        from: null,
                        to: 'À traiter',
                        to_status: 'todo',
                        by: 'Admin',
                        at: '2026-09-01T09:00:00+00:00',
                    },
                    {
                        id: 2,
                        from: 'À traiter',
                        to: 'En cours',
                        to_status: 'in_progress',
                        by: null,
                        at: '2026-09-02T09:00:00+00:00',
                    },
                ]}
                invoices={[]}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Léa Durand',
        );
        expect(
            screen.getByRole('button', { name: 'Copier la référence LD-4821' }),
        ).toHaveTextContent('LD-4821');
        expect(
            screen.getByRole('link', { name: 'lea@example.com' }),
        ).toHaveAttribute('href', 'mailto:lea@example.com');
        expect(
            screen.getByRole('link', { name: '+33 6 00 00 00 00' }),
        ).toHaveAttribute('href', 'tel:+33600000000');
        expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-000000000001/edit',
        );
        expect(screen.getAllByText(/2.500,00.*\/ mois/).length).toBeGreaterThan(
            0,
        );
        // Palier de budget pour les quartiers visés (3e et 4e : chers, 2 500 € = correct).
        expect(screen.getByText('Correct')).toBeInTheDocument();
        expect(
            screen.getAllByText(
                /^(Dans \d+ j|Arrivé depuis \d+ j|Aujourd'hui)$/,
            ),
        ).toHaveLength(1);
        // Plus de bandeau de chiffres clés : le budget vit dans la section Projet.
        expect(
            screen.queryByLabelText('Chiffres clés'),
        ).not.toBeInTheDocument();
        expect(screen.getAllByText('Budget mensuel')).toHaveLength(1);
        // Carte des quartiers repliée par défaut.
        expect(
            screen.queryByRole('group', { name: 'Arrondissements visés' }),
        ).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Voir la carte des quartiers' }),
        );
        const map = within(
            screen.getByRole('group', { name: 'Arrondissements visés' }),
        );
        expect(
            map.getByRole('button', { name: '3e arrondissement' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByText('Arrive avec sa famille, cherche un 3 pièces.'),
        ).toBeInTheDocument();
        // Formulation unique pour les champs vides.
        expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(1);
        expect(screen.queryByText(/Non précisé/)).not.toBeInTheDocument();

        // Fil d'activité : notes et statuts mêlés, compteur, filtres.
        const section = within(
            screen.getByRole('region', { name: 'Activité' }),
        );
        expect(section.getByLabelText('3 entrées')).toHaveTextContent('3');
        expect(screen.queryByText('Rappeler mardi.')).not.toBeInTheDocument();
        await userEvent.click(
            section.getByRole('button', { name: 'Voir l’activité' }),
        );
        const activity = within(
            screen.getByRole('dialog', { name: 'Activité' }),
        );
        expect(activity.getByText('Rappeler mardi.')).toBeInTheDocument();
        expect(activity.getByText(/depuis À traiter/)).toBeInTheDocument();
        await userEvent.click(activity.getByRole('radio', { name: 'Statuts' }));
        expect(activity.queryByText('Rappeler mardi.')).not.toBeInTheDocument();
        expect(activity.getAllByRole('listitem')).toHaveLength(2);
    });

    it('posts a new note, also with ⌘+Entrée', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        expect(
            screen.queryByRole('textbox', { name: 'Nouvelle note' }),
        ).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Voir l’activité' }),
        );
        expect(
            screen.getByRole('button', { name: 'Ajouter la note' }),
        ).toBeDisabled();
        const box = screen.getByRole('textbox', { name: 'Nouvelle note' });
        await user.type(box, 'Très motivé.');
        await user.keyboard('{Meta>}{Enter}{/Meta}');

        expect(post).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/notes',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('marks the lead as contacted now and shows the blocked visio button', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Programmer une visio' }),
        ).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Mettre à jour' }));

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/contact',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('warns about duplicates and lets admins reach the delete action', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                notes={[]}
                history={[]}
                duplicates={[
                    {
                        id: 9,
                        uuid: '0199a9a0-0000-7000-8000-000000000009',
                        name: 'Léa Durand (pro)',
                        email: 'lea@example.com',
                        phone: null,
                        status_label: 'Converti',
                        url: '/locataires/0199a9a0-0000-7000-8000-000000000009',
                    },
                ]}
                can={{ delete: true }}
                invoices={[]}
            />,
        );

        const alert = screen.getByTestId('lead-duplicates');
        expect(alert).toHaveTextContent('Un autre lead partage cet e-mail');
        expect(
            within(alert).getByRole('link', { name: 'Léa Durand (pro)' }),
        ).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-000000000009',
        );

        await user.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        expect(
            await screen.findByRole('menuitem', { name: 'Supprimer le lead' }),
        ).toBeInTheDocument();
    });

    it('shows the recontact block in the assignee card', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    recontact_channel: 'whatsapp',
                    recontact_channel_label: 'WhatsApp',
                    recontact_at: '2020-01-01',
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        const card = within(
            screen.getByRole('region', { name: 'Responsable' }),
        );
        expect(card.getByText(/WhatsApp ·/)).toBeInTheDocument();
        expect(card.getByText(/En retard de \d+ j/)).toHaveAttribute(
            'data-late',
            'true',
        );
        expect(
            card.getByRole('button', { name: 'Reporter' }),
        ).toBeInTheDocument();
    });

    it('shows the loss reason on an archived lead', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    status: 'archived',
                    status_label: 'Archivé',
                    loss_reason: 'too_expensive',
                    loss_reason_label: 'Trop cher',
                    loss_note: 'Budget à 900 €.',
                })}
                notes={[]}
                history={[]}
            />,
        );

        expect(screen.getByTestId('loss-reason')).toHaveTextContent(
            'Motif : Trop cher · Budget à 900 €.',
        );
    });
});

describe('First contact countdown on the lead page', () => {
    it('shows the overdue timer on a lead left without contact', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    status: 'todo',
                    created_at: new Date(
                        Date.now() - 45 * 60_000,
                    ).toISOString(),
                    last_contacted_at: null,
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        const timer = screen.getByRole('timer');
        expect(timer).toHaveTextContent(/^En retard · \+15:0\d$/);
        expect(timer).toHaveAttribute('data-late', 'true');
    });
    it('puts the inbound message first and condenses empty sections for a fresh website lead', async () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    status: 'todo',
                    source: 'website',
                    company: null,
                    budget_cents: null,
                    arrival_at: null,
                    offer_label: null,
                    score: null,
                    qualification_note: null,
                    origin_city: null,
                    districts: [],
                    property_types: [],
                    duration_label: null,
                    guarantor_label: null,
                    furnished_label: null,
                    message:
                        "Bonjour, j'arrive à Paris en octobre avec ma famille.",
                })}
                inbound={makeInbound()}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        const block = screen.getByTestId('lead-inbound');
        expect(block).toHaveAttribute('data-state', 'open');
        expect(block).toHaveTextContent('Message reçu depuis le site');
        expect(block).toHaveTextContent('CT-4F2A11');
        expect(block).toHaveTextContent("j'arrive à Paris en octobre");
        expect(
            within(block).getByRole('button', { name: 'Je m’en occupe' }),
        ).toBeInTheDocument();

        // Le message n'est pas répété dans « Note sur le projet ».
        expect(
            screen.queryByRole('region', { name: 'Note sur le projet' }),
        ).not.toBeInTheDocument();
        // Projet et Qualification sont vides : une ligne et un bouton chacun, pas de grille de champs vides.
        expect(screen.getAllByText('Non renseigné')).toHaveLength(2);
        expect(screen.getAllByRole('link', { name: 'Compléter' })).toHaveLength(
            2,
        );
        const qualification = within(
            screen.getByRole('region', { name: 'Qualification' }),
        );
        expect(qualification.getByText('Non renseigné')).toBeInTheDocument();
        expect(
            qualification.getByRole('link', { name: 'Compléter' }),
        ).toHaveAttribute(
            'href',
            '/locataires/' + makeLeadDetail().uuid + '/edit',
        );
    });

    it('collapses the inbound message once the lead is being handled', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    status: 'in_progress',
                    source: 'phone',
                })}
                inbound={makeInbound({
                    kind: 'call',
                    meta: 'Appel entrant (5,5 min, répondu)',
                    body: 'Cherche un T2 dans le 11e.',
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        const block = screen.getByTestId('lead-inbound');
        expect(block).toHaveAttribute('data-state', 'collapsed');
        expect(block).not.toHaveTextContent('Cherche un T2');
        await user.click(
            within(block).getByRole('button', { name: 'Afficher' }),
        );
        expect(block).toHaveTextContent('Cherche un T2 dans le 11e.');
        expect(
            within(block).queryByRole('button', { name: 'Je m’en occupe' }),
        ).not.toBeInTheDocument();
        // Les sections gardent leurs lignes « Non renseigné » sur un lead déjà pris en charge.
        expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(0);
    });

    it('splits the file into Dossier, Commercial and Partenaires tabs', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                notes={[]}
                history={[]}
                invoices={[]}
                quotes={[]}
                documentRequests={[]}
            />,
        );

        const tabs = screen.getAllByRole('tab');
        expect(tabs.map((tab) => tab.textContent)).toEqual([
            'Dossier',
            'Commercial',
            'Partenaires',
        ]);
        // Onglet Dossier ouvert par défaut : contact, projet, qualification.
        expect(
            screen.getByRole('region', { name: 'Contact' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Qualification' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Factures' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Agent en contact' }),
        ).not.toBeInTheDocument();
        // La colonne droite reste limitée au suivi et à l'activité.
        expect(
            screen.getByRole('region', { name: 'Responsable' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Activité' }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Commercial' }));
        expect(
            screen.getByRole('region', { name: 'Devis' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Factures' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Documents' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Contact' }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Partenaires' }));
        expect(
            screen.getByRole('region', { name: 'Agent en contact' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Partenaires du dossier' }),
        ).toBeInTheDocument();
    });

    it('shows a counter on the Commercial and Partenaires tabs', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                notes={[]}
                history={[]}
                invoices={[leadInvoice(1), leadInvoice(2)]}
                quotes={[]}
                documentRequests={[]}
            />,
        );

        expect(
            screen.getByRole('tab', { name: /Commercial/ }),
        ).toHaveTextContent('Commercial2');
        expect(
            within(
                screen.getByRole('tab', { name: /Commercial/ }),
            ).getByLabelText('2 éléments'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: 'Partenaires' }),
        ).toHaveTextContent(/^Partenaires$/);
    });
});
