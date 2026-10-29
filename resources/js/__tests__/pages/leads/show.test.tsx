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
            features: { assistant: true },
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
    leadEditOptions,
    leadStatuses,
    lossReasons,
    makeInbound,
    makeLeadDetail,
    makeLeadPeople,
    makeLeadPerson,
    makeLeadPropertyDetail,
    makeVerdict,
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
    kind: 'team',
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
        { value: 'visio' as const, label: 'Visio' },
    ],
    duplicates: [],
    inbound: null,
    can: { delete: false },
    invoices: [],
    quotes: [],
    lossReasons,
};

describe('Lead detail page', () => {
    it('shows the proposed property of an owner lead and edits it on the owner lead form', async () => {
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
        // « Modifier » vit dans le menu « ⋯ », avec les autres actions.
        await userEvent.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        expect(
            await screen.findByRole('menuitem', { name: 'Modifier' }),
        ).toHaveAttribute(
            'href',
            '/owners/leads/0199a9a0-0000-7000-8000-000000000001/edit',
        );
    });

    it('offers to complete an owner lead without a property yet', async () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ segment: 'owner' })}
                property={null}
                notes={[]}
                history={[]}
            />,
        );

        // Sans bien, l'accordéon est replié : on l'ouvre pour lire les champs
        // vides, chacun à compléter en place (28 octobre 2026).
        await userEvent.click(
            screen.getByRole('button', { name: 'Bien proposé' }),
        );
        const section = within(
            screen.getByRole('region', { name: 'Bien proposé' }),
        );
        expect(section.getAllByText('Non renseigné')).toHaveLength(16);
        await userEvent.click(
            section.getByRole('button', { name: 'Modifier Surface' }),
        );
        await userEvent.type(
            section.getByRole('spinbutton', { name: 'Surface' }),
            '55{Enter}',
        );
        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/property',
            { surface: 55 },
            expect.anything(),
        );
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
        // « Modifier » et « Convertir en client » vivent dans le menu « ⋯ ».
        expect(
            screen.queryByRole('button', { name: 'Convertir en client' }),
        ).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        expect(
            await screen.findByRole('menuitem', { name: 'Modifier' }),
        ).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-000000000001/edit',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Convertir en client' }),
        ).toBeInTheDocument();
        await userEvent.keyboard('{Escape}');
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

        // Fil d'activité : un seul bouton « Notes », le compte en pastille dedans.
        expect(
            screen.queryByRole('region', { name: 'Activité' }),
        ).not.toBeInTheDocument();
        const notesButton = screen.getByRole('button', { name: /^Notes/ });
        expect(
            within(notesButton).getByLabelText('3 entrées'),
        ).toHaveTextContent('3');
        expect(screen.queryByText('Rappeler mardi.')).not.toBeInTheDocument();
        await userEvent.click(notesButton);
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
        await user.click(screen.getByRole('button', { name: /^Notes/ }));
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

    it('marks the lead as contacted now, and schedules the video call from the « Planifier » popover', async () => {
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

        // Un seul bouton pour tout : « Planifier » ouvre le choix du canal,
        // et la visio s'y programme (plus de bouton « Programmer une visio »).
        expect(
            screen.queryByRole('button', { name: 'Programmer une visio' }),
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Planifier' }));
        await user.click(
            await screen.findByRole('combobox', { name: 'Canal' }),
        );
        await user.click(await screen.findByRole('option', { name: 'Visio' }));
        expect(
            screen.getByRole('button', { name: 'Programmer la visio' }),
        ).toBeInTheDocument();
        await user.keyboard('{Escape}');

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

        const card = within(screen.getByRole('region', { name: 'Suivi par' }));
        // Le suivi est une frise : dernier contact puis prochain recontact.
        const steps = card.getAllByRole('listitem');
        expect(steps[0]).toHaveTextContent('Dernier contact');
        expect(steps[1]).toHaveTextContent('Prochain recontact');
        expect(card.getByText(/WhatsApp ·/)).toBeInTheDocument();
        expect(card.getByText(/En retard de \d+ j/)).toHaveAttribute(
            'data-late',
            'true',
        );
        expect(
            card.getByRole('button', { name: 'Reporter' }),
        ).toBeInTheDocument();
    });

    it('shows a scheduled video call as a step of the follow-up timeline, with its Meet link', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    visio_at: '2026-11-03T10:00:00+01:00',
                    visio_meet_link: 'https://meet.google.com/abc-defg-hij',
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        const card = within(screen.getByRole('region', { name: 'Suivi par' }));
        const steps = card.getAllByRole('listitem');
        expect(steps.map((step) => step.textContent)).toEqual([
            expect.stringContaining('Dernier contact'),
            expect.stringContaining('Appel vidéo prévu'),
            expect.stringContaining('Prochain recontact'),
        ]);
        expect(steps[1]).toHaveTextContent('3 novembre 2026 à 10:00');
        expect(
            within(steps[1]!).getByRole('link', {
                name: 'Rejoindre sur Google Meet',
            }),
        ).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
        expect(
            document.querySelectorAll('[data-test="visio-summary"]'),
        ).toHaveLength(1);
        // Un seul bouton, « Planifier », qui proposera de déplacer la visio.
        expect(
            card.getByRole('button', { name: 'Planifier' }),
        ).toBeInTheDocument();
    });

    it('shows the loss reason on an archived lead', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    status: 'archived',
                    status_label: 'Archivé',
                    loss_reason: 'small_budget',
                    loss_reason_label: 'Trop petit budget',
                    loss_note: 'Budget à 900 €.',
                })}
                notes={[]}
                history={[]}
            />,
        );

        expect(screen.getByTestId('loss-reason')).toHaveTextContent(
            'Motif : Trop petit budget · Budget à 900 €.',
        );
    });
});

describe('Next step banner on the lead page', () => {
    it('says the overdue recontact first and opens the planning dialog from the banner', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    recontact_channel: 'phone',
                    recontact_channel_label: 'Téléphone',
                    recontact_at: '2020-01-01T10:00:00+01:00',
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        const banner = screen.getByTestId('lead-next-step');
        expect(banner).toHaveAttribute('data-tone', 'late');
        expect(banner).toHaveTextContent(
            /Recontact en retard de \d+ j · Téléphone/,
        );
        await user.click(
            within(banner).getByRole('button', { name: 'Reporter' }),
        );
        expect(
            await screen.findByRole('dialog', {
                name: 'Reporter le recontact',
            }),
        ).toBeInTheDocument();
    });

    it('shows nothing when the lead is up to date, and no creation line under the name', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    status: 'in_progress',
                    last_contacted_at: new Date().toISOString(),
                    recontact_at: null,
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        expect(screen.queryByTestId('lead-next-step')).toBeNull();
        expect(document.querySelector('[data-test="lead-author"]')).toBeNull();
    });

    it('flags a lead left unassigned for weeks and keeps a « Message reçu » row even without inbound message', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    assignee: null,
                    created_at: '2020-01-01T10:00:00+01:00',
                    last_contacted_at: new Date().toISOString(),
                })}
                inbound={null}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        expect(screen.getByTestId('unassigned-warning')).toHaveTextContent(
            /Non attribué depuis \d+ j/,
        );
        expect(
            screen.getByRole('region', { name: 'Message reçu' }),
        ).toHaveTextContent('Aucun message d’arrivée');
    });
});

describe('Inline contact editing on the lead page', () => {
    it('edits the e-mail in place and saves it through the fields route', async () => {
        patch.mockClear();
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                editOptions={leadEditOptions}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier E-mail' }),
        );
        const input = screen.getByRole('textbox', { name: 'E-mail' });
        await user.clear(input);
        await user.type(input, 'lea.durand@example.com{Enter}');

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/fields',
            { email: 'lea.durand@example.com' },
            expect.objectContaining({ preserveScroll: true }),
        );
        // La langue se choisit dans une liste, la société et le téléphone en texte.
        for (const label of ['Langue', 'Société', 'Téléphone']) {
            expect(
                screen.getByRole('button', { name: `Modifier ${label}` }),
            ).toBeInTheDocument();
        }
    });
});

describe('Company directory shortcut on the lead page', () => {
    it('adds the company to the directory from the « Société » row, then links to it once attached', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ company: 'Nestlé' })}
                editOptions={leadEditOptions}
                notes={[]}
                history={[]}
            />,
        );

        const add = screen.getByRole('button', {
            name: 'Ajouter aux entreprises',
        });
        // Un simple rond « + », sur la ligne de la société.
        expect(add).toHaveClass('rounded-full');
        expect(add).not.toHaveTextContent('Ajouter');
        await user.click(add);
        expect(post).toHaveBeenCalledWith(
            '/companies/from-lead/0199a9a0-0000-7000-8000-000000000001',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );

        rerender(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ company: 'Nestlé' })}
                editOptions={leadEditOptions}
                directoryCompany={{ uuid: 'c-1', name: 'Nestlé' }}
                notes={[]}
                history={[]}
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Ajouter aux entreprises' }),
        ).toBeNull();
        expect(
            screen.getByRole('link', { name: 'Voir l’entreprise Nestlé' }),
        ).toHaveAttribute('href', '/companies/c-1');

        // Sans société, rien à ajouter.
        rerender(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ company: null })}
                editOptions={leadEditOptions}
                notes={[]}
                history={[]}
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Ajouter aux entreprises' }),
        ).toBeNull();
    });
});

describe('People on the lead page', () => {
    it('lists the household in a « Personnes » fold and saves a field of the second person on its own route', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                editOptions={leadEditOptions}
                people={makeLeadPeople({
                    co: makeLeadPerson({
                        slot: 'co',
                        name: 'Marc Durand',
                        first_name: 'Marc',
                        last_name: 'Durand',
                    }),
                })}
                notes={[]}
                history={[]}
            />,
        );

        const fold = within(screen.getByRole('region', { name: 'Personnes' }));
        expect(fold.getByText('Marc Durand')).toBeInTheDocument();
        const co = within(fold.getByRole('region', { name: 'Marc Durand' }));
        await user.click(
            co.getByRole('button', { name: 'Modifier Employeur' }),
        );
        await user.type(
            co.getByRole('textbox', { name: 'Employeur' }),
            'Axa{Enter}',
        );
        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/people/co',
            { employer: 'Axa' },
            expect.anything(),
        );
        // La situation pro a quitté le Projet pour la section Personnes.
        expect(
            within(screen.getByRole('region', { name: 'Projet' })).queryByText(
                'Situation pro',
            ),
        ).toBeNull();
    });
});

describe('AI check shortcuts on the lead page', () => {
    it('archives with the assistant’s reason prefilled from a red verdict', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ status: 'in_progress' })}
                verdict={makeVerdict({
                    value: 'not_qualified',
                    label: 'Non qualifié',
                    reason: 'Demande d’achat, hors cible.',
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Archiver avec ce motif' }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        expect(
            dialog.getByRole('radio', { name: 'Pas du tout qualifié' }),
        ).toBeChecked();
        expect(dialog.getByLabelText('Précision (facultatif)')).toHaveValue(
            'Demande d’achat, hors cible.',
        );
        await user.click(dialog.getByRole('button', { name: /Archiver/ }));
        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/status',
            {
                status: 'archived',
                loss_reason: 'not_qualified',
                loss_note: 'Demande d’achat, hors cible.',
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('opens the planning dialog from a green verdict', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ status: 'todo', recontact_at: null })}
                verdict={makeVerdict()}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Planifier le premier contact',
            }),
        );
        expect(
            await screen.findByRole('dialog', {
                name: 'Planifier le prochain recontact',
            }),
        ).toBeInTheDocument();
    });
});

describe('Arrival message on the lead page', () => {
    it('does not repeat the website message under the project once the lead is in progress', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    status: 'in_progress',
                    message: 'Arrive avec sa famille, cherche un 3 pièces.',
                })}
                inbound={makeInbound({
                    body: 'Arrive avec sa famille, cherche un 3 pièces.',
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        // La carte d'arrivée porte le message ; le projet ne le cite pas.
        expect(
            screen.getAllByText('Arrive avec sa famille, cherche un 3 pièces.'),
        ).toHaveLength(1);
        expect(
            within(screen.getByRole('region', { name: 'Projet' })).queryByText(
                'Arrive avec sa famille, cherche un 3 pièces.',
            ),
        ).toBeNull();
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
    it('puts the inbound message first and condenses empty sections for a fresh website lead', () => {
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
                verdict={makeVerdict()}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        // L'avis de l'assistant précède le message reçu.
        const check = screen.getByTestId('lead-ai-check');
        expect(check).toHaveAttribute('data-verdict', 'qualified');
        expect(
            check.compareDocumentPosition(screen.getByTestId('lead-inbound')) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        const block = screen.getByTestId('lead-inbound');
        expect(block).toHaveAttribute('data-state', 'open');
        expect(block).toHaveTextContent('Message reçu depuis le site');
        expect(block).not.toHaveTextContent('CT-4F2A11');
        expect(block).toHaveTextContent('Topic : Recherche de logement');
        expect(block).toHaveTextContent("j'arrive à Paris en octobre");
        expect(
            within(block).queryByRole('button', { name: 'Je m’en occupe' }),
        ).not.toBeInTheDocument();
        // L'attribution vit dans « Suivi par » : avatar et « Attribuer ».
        expect(
            screen.getByRole('button', { name: /Attribuer|Suivi par/ }),
        ).toHaveTextContent('Attribuer');

        // Le message n'est pas répété dans « Note sur le projet ».
        expect(
            screen.queryByRole('region', { name: 'Note sur le projet' }),
        ).not.toBeInTheDocument();
        // Le Projet est replié, puis montre chaque champ même vide : on les
        // complète en place, il n'y a plus de page « Compléter » à ouvrir.
        // Le Projet s'ouvre d'emblée et montre chaque champ même vide : on les
        // complète en place, il n'y a plus de page « Compléter » à ouvrir.
        const project = within(screen.getByRole('region', { name: 'Projet' }));
        expect(project.getAllByText('Non renseigné').length).toBeGreaterThan(1);
        expect(
            screen.queryByRole('link', { name: 'Compléter' }),
        ).not.toBeInTheDocument();
        // Qualification porte son éditeur en place (note, qualité), pas une
        // ligne « Non renseigné ».
        expect(
            within(
                screen.getByRole('region', { name: 'Qualification' }),
            ).getByRole('radiogroup', { name: 'Qualité du lead' }),
        ).toBeInTheDocument();
    });

    it('shows the summary of a later call on the fiche, not only in the notes', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({
                    status: 'in_progress',
                    source: 'referral',
                })}
                inbound={null}
                lastCall={makeInbound({
                    kind: 'call',
                    meta: 'Appel entrant (3 min, répondu)',
                    body: 'Veut visiter samedi matin.',
                    note_id: 7,
                })}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        const block = screen.getByTestId('lead-inbound');
        expect(block).toHaveAttribute('data-state', 'open');
        expect(block).toHaveTextContent('Résumé du dernier appel');
        expect(block).toHaveTextContent('Appel entrant (3 min, répondu)');
        expect(block).toHaveTextContent('Veut visiter samedi matin.');
    });

    it('never shows the same call twice: the arrival card already carries it', () => {
        const call = makeInbound({
            kind: 'call',
            meta: 'Appel entrant (0,6 min, message vocal)',
            body: 'Propose un chalet à louer.',
            note_id: 12,
        });

        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail({ status: 'todo', source: 'phone' })}
                inbound={call}
                lastCall={call}
                notes={[]}
                history={[]}
                invoices={[]}
            />,
        );

        expect(screen.getAllByTestId('lead-inbound')).toHaveLength(1);
    });

    it('keeps the inbound message open whatever the status, and folds it on demand', async () => {
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
        // Déplié par défaut, même pour un lead déjà pris en charge.
        expect(block).toHaveAttribute('data-state', 'open');
        expect(block).toHaveTextContent('Cherche un T2 dans le 11e.');
        await user.click(
            within(block).getByRole('button', { name: 'Replier' }),
        );
        expect(block).toHaveAttribute('data-state', 'collapsed');
        expect(block).not.toHaveTextContent('Cherche un T2');
        expect(
            within(block).queryByRole('button', { name: 'Je m’en occupe' }),
        ).not.toBeInTheDocument();
        // Les sections gardent leurs lignes « Non renseigné » sur un lead déjà pris en charge.
        expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(0);
    });

    it('splits the file into two columns with Qualification, Devis and Factures folds on the right', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                notes={[]}
                history={[]}
                invoices={[]}
                quotes={[]}
            />,
        );

        // La page est coupée en deux moitiés séparées d'un filet : à gauche la
        // personne et son suivi (en-tête, contact en lignes, suivi, activité),
        // à droite le projet (projet, qualification, onglets Commercial et
        // Partenaires).
        const columns = screen.getByTestId('lead-columns');
        expect(columns).toHaveClass('lg:grid-cols-2', 'lg:divide-x');
        expect(columns.children).toHaveLength(2);
        // La colonne de gauche reste collée sous l'en-tête pendant que le
        // projet défile.
        expect(columns.children[0]).toHaveClass(
            'lg:sticky',
            'lg:top-20',
            'lg:self-start',
        );
        // Le filet vertical court sur toute la hauteur : la grille remplit
        // la page et les colonnes portent le padding haut et bas.
        expect(columns).toHaveClass('lg:flex-1');
        expect(columns.children[1]).toHaveClass('lg:pb-10');
        const left = within(columns.children[0] as HTMLElement);
        const right = within(columns.children[1] as HTMLElement);
        expect(left.getByRole('heading', { level: 1 })).toBeInTheDocument();
        // L'en-tête est posé sur un fond gris clair.
        expect(left.getByTestId('lead-header')).toHaveClass('bg-sidebar');
        // Le contact est une liste de lignes sur deux colonnes, pas une carte.
        const contact = left.getByRole('region', { name: 'Contact' });
        expect(contact.querySelector('dl')).toHaveClass('sm:grid-cols-2');
        expect(contact).not.toHaveClass('bg-sidebar');
        expect(
            left.getByRole('region', { name: 'Suivi par' }),
        ).toBeInTheDocument();
        expect(
            left.getByRole('button', { name: /^Notes/ }),
        ).toBeInTheDocument();
        expect(
            right.getByRole('region', { name: 'Projet' }),
        ).toBeInTheDocument();
        expect(
            right.getByRole('region', { name: 'Qualification' }),
        ).toBeInTheDocument();
        // Plus d'onglet : Qualification, Devis et Factures sont trois
        // accordéons à filet. Vides, ils sont repliés ; Documents et
        // Partenaires ne sont plus sur la fiche lead.
        expect(right.queryAllByRole('tab')).toHaveLength(0);
        // Qualification est garnie, donc ouverte ; Devis et Factures,
        // vides, sont repliés.
        expect(
            right.getByRole('button', { name: 'Qualification' }),
        ).toHaveAttribute('aria-expanded', 'true');
        for (const title of ['Devis', 'Factures']) {
            expect(right.getByRole('button', { name: title })).toHaveAttribute(
                'aria-expanded',
                'false',
            );
        }
        expect(
            screen.queryByRole('region', { name: 'Agent en contact' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Documents' }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Devis' }));
        expect(screen.getByText('Aucun devis pour ce lead.')).toBeVisible();
        // Le contact reste lisible à gauche.
        expect(
            screen.getByRole('region', { name: 'Contact' }),
        ).toBeInTheDocument();
    });

    it('opens the Factures fold with its count when invoices exist', () => {
        render(
            <LeadsShow
                {...base}
                lead={makeLeadDetail()}
                notes={[]}
                history={[]}
                invoices={[leadInvoice(1), leadInvoice(2)]}
                quotes={[]}
            />,
        );

        const fold = screen.getByRole('button', { name: /Factures/ });
        expect(fold).toHaveAttribute('aria-expanded', 'true');
        expect(fold).toHaveTextContent('Factures2');
        expect(screen.getByRole('button', { name: 'Devis' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });
});
