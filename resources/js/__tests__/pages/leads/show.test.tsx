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
} from '@/test/fixtures/lead';
import type { LeadNote } from '@/types';

const note = (overrides: Partial<LeadNote> = {}): LeadNote => ({
    id: 1,
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
    can: { delete: false },
    invoices: [],
    documentRequests: [],
    lossReasons,
};

describe('Lead detail page', () => {
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
            '/leads/1/edit',
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
        const kpis = within(screen.getByLabelText('Chiffres clés'));
        expect(kpis.getByText('Budget mensuel')).toBeInTheDocument();
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
        const activity = within(
            screen.getByRole('region', { name: 'Activité' }),
        );
        expect(activity.getByLabelText('3 entrées')).toHaveTextContent('3');
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
            screen.getByRole('button', { name: 'Ajouter la note' }),
        ).toBeDisabled();
        const box = screen.getByRole('textbox', { name: 'Nouvelle note' });
        await user.type(box, 'Très motivé.');
        await user.keyboard('{Meta>}{Enter}{/Meta}');

        expect(post).toHaveBeenCalledWith(
            '/leads/1/notes',
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
            '/leads/1/contact',
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
                        name: 'Léa Durand (pro)',
                        email: 'lea@example.com',
                        phone: null,
                        status_label: 'Converti',
                        url: '/leads/9',
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
        ).toHaveAttribute('href', '/leads/9');

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
