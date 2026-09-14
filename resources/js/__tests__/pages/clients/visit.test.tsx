import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: vi.fn(), patch, delete: vi.fn() },
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string } | string;
        children: ReactNode;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

import VisitShow from '@/pages/clients/visit';
import { makeVisit, makeVisitDetail } from '@/test/fixtures/visit';

const others = [
    makeVisit({
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000a2',
        scheduled_at: '2026-09-20T13:00:00+02:00',
    }),
    makeVisit({
        id: 3,
        uuid: '0199a9a0-0000-7000-8000-0000000000a3',
        scheduled_at: '2026-09-25T09:15:00+02:00',
        status: 'done',
        status_label: 'Effectuée',
        report_due: true,
    }),
];

describe('Visit detail page', () => {
    it('counts the visits of the client instead of listing them', () => {
        render(<VisitShow visit={makeVisitDetail()} otherVisits={others} />);

        // Le nombre de visites se lit à côté du dossier ; la liste des autres
        // visites, redondante avec le dossier, a disparu de la fiche.
        expect(
            screen.getByRole('link', {
                name: 'Voir les visites de Léa Durand',
            }),
        ).toHaveTextContent('3 visites pour ce client');
        expect(
            screen.queryByRole('region', { name: 'Autres visites du client' }),
        ).not.toBeInTheDocument();
    });

    it('says one visit when the client has no other visit', () => {
        render(<VisitShow visit={makeVisitDetail()} otherVisits={[]} />);

        expect(
            screen.getByRole('link', {
                name: 'Voir les visites de Léa Durand',
            }),
        ).toHaveTextContent('1 visite pour ce client');
    });

    it('unlocks the report only once the visit has happened', () => {
        const { unmount } = render(
            <VisitShow
                visit={makeVisitDetail({ can_report: false, report: null })}
                otherVisits={[]}
            />,
        );

        const upcoming = within(
            screen.getByRole('region', { name: 'Compte rendu' }),
        );

        expect(upcoming.queryByRole('button', { name: 'Rédiger' })).toBeNull();
        expect(
            upcoming.getByText('Le compte rendu s’écrira après la visite.'),
        ).toBeInTheDocument();

        unmount();

        // Passé l'heure, le bouton apparaît.
        render(
            <VisitShow
                visit={makeVisitDetail({
                    can_report: true,
                    report: null,
                    report_due: true,
                })}
                otherVisits={[]}
            />,
        );

        const past = within(
            screen.getByRole('region', { name: 'Compte rendu' }),
        );

        expect(
            past.getByRole('button', { name: 'Rédiger' }),
        ).toBeInTheDocument();
        expect(
            past.getByText(
                'La visite est passée : le compte rendu reste à écrire.',
            ),
        ).toBeInTheDocument();
    });

    it('says a cancelled visit expects no report', () => {
        render(
            <VisitShow
                visit={makeVisitDetail({
                    can_report: false,
                    report: null,
                    status: 'cancelled',
                    status_label: 'Annulée',
                })}
                otherVisits={[]}
            />,
        );

        expect(
            screen.getByText('Visite annulée : aucun compte rendu attendu.'),
        ).toBeInTheDocument();
    });

    it('opens the property photos as a full-screen slideshow', async () => {
        const user = userEvent.setup();
        render(
            <VisitShow
                visit={makeVisitDetail({
                    property: {
                        ...makeVisitDetail().property,
                        photos: ['/photo-1.jpg', '/photo-2.jpg'],
                    },
                })}
                otherVisits={[]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: /Agrandir la photo 2/ }),
        );

        expect(screen.getByRole('dialog')).toHaveTextContent('Photo 2 sur 2');
    });

    it('shows the report as written, in plain text', () => {
        render(
            <VisitShow
                visit={makeVisitDetail({
                    can_report: true,
                    report: 'Une visite très positive.',
                })}
                otherVisits={[]}
            />,
        );

        expect(
            within(
                screen.getByRole('region', { name: 'Compte rendu' }),
            ).getByText('Une visite très positive.'),
        ).toBeInTheDocument();
    });

    it('shows the report photos, openable the same way', async () => {
        const user = userEvent.setup();
        render(
            <VisitShow
                visit={makeVisitDetail({
                    report: 'Le client a aimé la lumière.',
                    report_photos: ['/report-1.jpg'],
                })}
                otherVisits={[]}
            />,
        );

        const report = screen.getByRole('region', { name: 'Compte rendu' });
        await user.click(
            within(report).getByRole('button', { name: /Agrandir la photo 1/ }),
        );

        expect(screen.getByRole('dialog')).toHaveTextContent('Photo 1 sur 1');
    });

    it('follows up on the property once the report is written', async () => {
        const user = userEvent.setup();
        const outcome = {
            status: 'pending' as const,
            status_label: 'À décider',
            visited_at: '2026-09-10T10:00:00+02:00',
            decision_due: false,
            reminder_at: '2099-09-14T09:00:00+02:00',
            options: [
                {
                    value: 'pending' as const,
                    label: 'À décider',
                    hint: 'Le client n’a pas encore décidé.',
                },
                {
                    value: 'declined' as const,
                    label: 'Ne se positionne pas',
                    hint: 'Le bien ne l’intéresse pas après visite.',
                },
                {
                    value: 'applied' as const,
                    label: 'Dossier déposé',
                    hint: 'La candidature est partie, en attente de réponse.',
                },
            ],
        };

        // Sans compte rendu, la question ne se pose pas encore.
        const { unmount } = render(
            <VisitShow
                visit={makeVisitDetail({ report: null })}
                otherVisits={[]}
                outcome={outcome}
            />,
        );
        expect(
            screen.queryByRole('region', { name: 'Suite de la visite' }),
        ).not.toBeInTheDocument();
        unmount();

        render(
            <VisitShow
                visit={makeVisitDetail({ report: 'Le client a aimé.' })}
                otherVisits={[]}
                outcome={outcome}
            />,
        );
        const section = within(
            screen.getByRole('region', { name: 'Suite de la visite' }),
        );
        // Le suivi dit ce que l'étape veut dire, et quand l'équipe est relancée.
        expect(
            section.getByText('Le client n’a pas encore décidé.'),
        ).toBeInTheDocument();
        expect(
            section.getByText('Prochaine relance le 14 sept. à 09:00'),
        ).toBeInTheDocument();

        await user.click(
            section.getByRole('button', { name: /Suite de la visite de/ }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: /Dossier déposé/ }),
        );
        expect(patch).toHaveBeenCalledWith(
            expect.stringContaining('/properties/'),
            { status: 'applied' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows the offer of the client next to their dossier', () => {
        render(
            <VisitShow
                visit={makeVisitDetail({
                    client: {
                        ...makeVisitDetail().client,
                        offer: 'confie',
                        offer_label: 'Confié',
                    },
                })}
                otherVisits={[]}
            />,
        );

        // La formule dit qui réalise la visite : elle se lit avec le nom.
        const present = within(
            screen.getByRole('region', { name: 'Qui est présent' }),
        );

        expect(present.getByText('Confié')).toBeInTheDocument();
    });

    it('drops the team member when the client visits alone', () => {
        const { unmount } = render(
            <VisitShow visit={makeVisitDetail()} otherVisits={[]} />,
        );
        expect(screen.getByText('Membre de l’équipe')).toBeInTheDocument();
        unmount();

        render(
            <VisitShow
                visit={makeVisitDetail({ mode: 'client_alone' })}
                otherVisits={[]}
            />,
        );
        // Personne de l'équipe n'y va : la ligne n'a rien à dire.
        expect(
            screen.queryByText('Membre de l’équipe'),
        ).not.toBeInTheDocument();
        expect(screen.getByText('Agent immobilier')).toBeInTheDocument();
    });

    it('no longer repeats a link to every visit in the overline', () => {
        render(<VisitShow visit={makeVisitDetail()} otherVisits={[]} />);

        expect(
            screen.queryByRole('link', { name: 'Toutes les visites' }),
        ).not.toBeInTheDocument();
    });
});
