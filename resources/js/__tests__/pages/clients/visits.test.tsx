import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: del, patch, post },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Admin', role: 'member' } },
            staff: [
                { id: 1, name: 'Admin', role: 'member', avatar: null },
                { id: 2, name: 'Charles', role: 'member', avatar: null },
            ],
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, unknown>) => useFormStub(initial),
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

let transform: (data: Record<string, unknown>) => unknown = (data) => data;

function useFormStub(initial: Record<string, unknown>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {} as Record<string, string | undefined>,
        processing: false,
        setData: (key: string | Record<string, unknown>, value?: unknown) =>
            setDataState((current) =>
                typeof key === 'string'
                    ? { ...current, [key]: value }
                    : { ...current, ...key },
            ),
        clearErrors: () => undefined,
        transform: (fn: (data: Record<string, unknown>) => unknown) => {
            transform = fn;
        },
        post: (url: string, options: unknown) =>
            post(url, transform(data), options),
        patch: (url: string, options: unknown) =>
            patch(url, transform(data), options),
    };
}

import ClientsVisits from '@/pages/clients/visits';
import {
    makeVisit,
    makeVisitClient,
    visitStatuses,
} from '@/test/fixtures/visit';

const visits = [
    makeVisit(),
    makeVisit({
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000a2',
        status: 'done',
        status_label: 'Effectuée',
        scheduled_at: '2026-09-01T15:00:00+02:00',
        client: {
            id: 2,
            uuid: 'client-2',
            name: 'Paul Roux',
            reference: 'LD-4822',
            offer: 'accompagne',
            offer_label: 'Accompagné',
        },
        agent: null,
    }),
];

function renderPage(list = visits) {
    return render(<ClientsVisits visits={list} statuses={visitStatuses} />);
}

/** Coche (ou décoche) une entrée du menu « Filtres ». */
async function toggleFilter(user: UserEvent, name: string | RegExp) {
    await user.click(screen.getByRole('button', { name: /Filtres/ }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name }));
    await user.keyboard('{Escape}');
}

describe('Clients visits page', () => {
    beforeEach(() => {
        post.mockReset();
        patch.mockReset();
        del.mockReset();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
        // L'URL est partagée entre les tests : `?report=` ouvrirait un dialogue ailleurs.
        window.history.replaceState({}, '', '/');
    });

    it('shows an empty state until visits exist', () => {
        renderPage([]);

        expect(
            screen.getByRole('heading', { name: 'Visites' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Aucune visite planifiée pour le moment'),
        ).toBeInTheDocument();
        expect(ClientsVisits.layout.breadcrumbs[1]?.href.url).toBe(
            '/clients/visits',
        );
    });

    it('lists the visits grouped by day with the day map on top, filtered by status and client', async () => {
        const user = userEvent.setup();
        vi.setSystemTime(new Date('2026-09-15T08:00:00+02:00'));
        renderPage();

        expect(
            screen.getByText(
                '2 visite(s) · 1 planifiée(s) · 1 passée(s) masquée(s)',
            ),
        ).toBeInTheDocument();
        // Carte des visites du jour, sur le jour courant qui a une visite.
        const map = within(
            screen.getByRole('region', { name: 'Visites du jour' }),
        );
        expect(
            map.getByRole('heading', {
                name: /Aujourd'hui · mardi 15 septembre 2026/,
            }),
        ).toBeInTheDocument();
        expect(
            map.getByRole('list', { name: 'Tournée du jour' }),
        ).toHaveTextContent('Léa Durand');
        // Sans clé Google Maps : repli explicite.
        expect(map.getByRole('note')).toHaveTextContent('Carte indisponible');

        // Un bloc par jour : aujourd'hui d'abord, puis les jours passés.
        const sections = screen
            .getAllByRole('region')
            .filter((section) => section.hasAttribute('data-day'));
        // Le passé sans compte rendu à écrire est masqué : reste aujourd'hui.
        expect(
            sections.map((section) => section.getAttribute('data-day')),
        ).toEqual(['2026-09-15']);
        const today = within(sections[0] as HTMLElement);
        expect(today.getByRole('heading')).toHaveTextContent(
            "Aujourd'hui · mardi 15 septembre 2026",
        );
        // Une colonne dit qui réalise la visite : l'équipe ou le client seul.
        expect(
            today.getByRole('columnheader', { name: 'Réalisée par' }),
        ).toBeInTheDocument();
        const rows = today.getAllByRole('row').slice(1);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toHaveTextContent('Par l’équipe');
        expect(rows[0]).toHaveTextContent('10:30');
        expect(rows[0]).toHaveTextContent('Léa Durand');
        expect(rows[0]).toHaveTextContent('T2 lumineux · 11e');
        expect(rows[0]).toHaveTextContent('Planifiée');
        expect(
            within(rows[0] as HTMLElement).getByRole('link', {
                name: 'Léa Durand',
            }),
        ).toHaveAttribute(
            'href',
            '/clients/0199a9a0-0000-7000-8000-000000000001',
        );

        // Le filtre de statut rouvre les visites passées correspondantes.
        await toggleFilter(user, /Effectuée/);
        expect(
            screen
                .getAllByRole('region')
                .filter((section) => section.hasAttribute('data-day')),
        ).toHaveLength(1);
        // La carte ne dépend pas des filtres de la liste.
        expect(
            screen.getByRole('region', { name: 'Visites du jour' }),
        ).toHaveTextContent('Léa Durand');

        expect(
            screen
                .getAllByRole('region')
                .filter((section) => section.hasAttribute('data-day'))[0],
        ).toHaveTextContent('Paul Roux');

        await toggleFilter(user, /Effectuée/);
        await toggleFilter(user, /Visites passées/);
        await user.type(
            screen.getByRole('textbox', { name: 'Filtrer par client' }),
            'paul',
        );
        const remaining = screen
            .getAllByRole('region')
            .filter((section) => section.hasAttribute('data-day'));
        expect(remaining).toHaveLength(1);
        expect(remaining[0]).toHaveTextContent('Paul Roux');
        vi.useRealTimers();
    });

    it('marks a visit done from its row menu', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour la visite de Léa Durand',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Marquer effectuée' }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/clients/visits/0199a9a0-0000-7000-8000-0000000000a1',
            { status: 'done' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('flags past visits without report, and saves the report from the row menu', async () => {
        const user = userEvent.setup();
        renderPage([
            makeVisit({
                id: 2,
                uuid: 'visit-due',
                status: 'done',
                status_label: 'Effectuée',
                scheduled_at: '2026-09-01T15:00:00+02:00',
                report_due: true,
            }),
            makeVisit({
                id: 3,
                uuid: 'visit-reported',
                status: 'done',
                status_label: 'Effectuée',
                scheduled_at: '2026-09-02T15:00:00+02:00',
                report: 'Client conquis.',
                report_author: 'Camille',
                client: {
                    id: 2,
                    uuid: 'client-2',
                    name: 'Paul Roux',
                    reference: 'LD-4822',
                    offer: 'accompagne',
                    offer_label: 'Accompagné',
                },
            }),
        ]);

        // Seule la visite sans compte rendu reste à l'écran.
        expect(screen.getByText('Compte rendu à rédiger')).toHaveAttribute(
            'data-report',
            'due',
        );
        expect(screen.queryByText('Compte rendu')).not.toBeInTheDocument();

        await toggleFilter(user, /Visites passées/);
        expect(screen.getByText('Compte rendu')).toHaveAttribute(
            'data-report',
            'done',
        );
        await toggleFilter(user, /Visites passées/);

        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour la visite de Léa Durand',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', {
                name: 'Rédiger le compte rendu',
            }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        await user.click(
            dialog.getByRole('button', { name: 'Enregistrer le compte rendu' }),
        );
        expect(post).not.toHaveBeenCalled();
        expect(dialog.getByText(/au moins 10 caractères/)).toBeInTheDocument();

        await user.type(
            dialog.getByLabelText('Compte rendu'),
            'Très bon accueil, cuisine un peu petite.',
        );
        // La prochaine étape se choisit en un clic, sans être obligatoire.
        await user.click(
            dialog.getByRole('radio', { name: 'Ne se positionne pas' }),
        );
        await user.click(
            dialog.getByRole('button', { name: 'Enregistrer le compte rendu' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/clients/visits/visit-due/report',
            expect.objectContaining({
                report: 'Très bon accueil, cuisine un peu petite.',
                next_status: 'declined',
            }),
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('asks for confirmation before cancelling a visit', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour la visite de Léa Durand',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Annuler la visite' }),
        );

        const dialog = within(await screen.findByRole('dialog'));
        expect(screen.getByRole('dialog')).toHaveTextContent(
            'Annuler la visite de Léa Durand ?',
        );

        // On peut se raviser : rien n'est envoyé.
        await user.click(
            dialog.getByRole('button', { name: 'Garder la visite' }),
        );
        expect(patch).not.toHaveBeenCalled();

        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour la visite de Léa Durand',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Annuler la visite' }),
        );
        await user.click(
            within(await screen.findByRole('dialog')).getByRole('button', {
                name: 'Annuler la visite',
            }),
        );
        expect(patch).toHaveBeenCalledWith(
            '/clients/visits/0199a9a0-0000-7000-8000-0000000000a1',
            { status: 'cancelled' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('opens the report dialog of the visit named in the e-mail link', async () => {
        window.history.replaceState({}, '', '/clients/visits?report=visit-due');
        renderPage([
            makeVisit({
                id: 2,
                uuid: 'visit-due',
                status: 'done',
                status_label: 'Effectuée',
                scheduled_at: '2026-09-01T15:00:00+02:00',
                report_due: true,
            }),
        ]);

        expect(
            await screen.findByRole('dialog', {
                name: 'Compte rendu de la visite de Léa Durand',
            }),
        ).toBeInTheDocument();
    });

    it('filters the visits still waiting for a return: the report, or the client', async () => {
        const user = userEvent.setup();
        render(
            <ClientsVisits
                statuses={visitStatuses}
                visits={[
                    makeVisit({
                        id: 1,
                        uuid: 'v-report',
                        status: 'done',
                        scheduled_at: '2026-09-10T10:00:00+02:00',
                        report: null,
                        report_due: true,
                        client: makeVisitClient({ name: 'Léa Durand' }),
                    }),
                    makeVisit({
                        id: 2,
                        uuid: 'v-client',
                        status: 'done',
                        scheduled_at: '2026-09-08T10:00:00+02:00',
                        report: 'Vu, lumineux.',
                        report_due: false,
                        outcome: 'pending',
                        client: makeVisitClient({ name: 'Bruno Petit' }),
                    }),
                    makeVisit({
                        id: 3,
                        uuid: 'v-done',
                        status: 'done',
                        scheduled_at: '2026-09-07T10:00:00+02:00',
                        report: 'Vu.',
                        report_due: false,
                        outcome: 'applied',
                        client: makeVisitClient({ name: 'Camille Roux' }),
                    }),
                ]}
            />,
        );

        // La liste seulement : la carte du jour, elle, ignore les filtres.
        const listed = () =>
            screen
                .getAllByRole('region')
                .filter(
                    (region) =>
                        region.getAttribute('aria-label') !== 'Visites du jour',
                )
                .map((region) => region.textContent)
                .join(' ');

        // Le retour du client : la visite faite, relue, mais rien de tranché.
        await toggleFilter(user, /Retour du client attendu/);
        expect(listed()).toContain('Bruno Petit');
        expect(listed()).not.toContain('Camille Roux');
        expect(listed()).not.toContain('Léa Durand');

        // Les deux attentes cochées : la visite tranchée reste dehors.
        await toggleFilter(user, /Compte rendu à rédiger/);
        expect(listed()).toContain('Léa Durand');
        expect(listed()).toContain('Bruno Petit');
        expect(listed()).not.toContain('Camille Roux');
    });

    it('links the schedule button to the dedicated page', () => {
        renderPage();

        expect(
            screen.getByRole('link', { name: 'Planifier une visite' }),
        ).toHaveAttribute('href', '/clients/visits/create');
    });

    it('puts the visits awaiting their report at the top of the list', () => {
        render(
            <ClientsVisits
                visits={[
                    makeVisit({
                        id: 1,
                        uuid: 'visit-1',
                        scheduled_at: '2026-09-20T11:00:00+00:00',
                    }),
                    makeVisit({
                        id: 2,
                        uuid: 'visit-2',
                        // Visite passée, effectuée, sans compte rendu.
                        scheduled_at: '2026-09-09T13:00:00+00:00',
                        status: 'done',
                        status_label: 'Effectuée',
                        report: null,
                        report_due: true,
                    }),
                ]}
                statuses={visitStatuses}
            />,
        );

        const sections = screen
            .getAllByRole('region')
            .map((region) => region.getAttribute('aria-label'));

        // La section des comptes rendus précède les journées (la carte du jour
        // reste au-dessus de la liste).
        const dueIndex = sections.indexOf('Comptes rendus à rédiger');
        const dayIndex = sections.findIndex((label) =>
            label?.includes('septembre 2026'),
        );
        expect(dueIndex).toBeGreaterThan(-1);
        expect(dueIndex).toBeLessThan(dayIndex);
        const due = within(
            screen.getByRole('region', { name: 'Comptes rendus à rédiger' }),
        );
        expect(due.getByText('Compte rendu à rédiger')).toBeInTheDocument();
        // Sortie de sa journée : celle-ci n'a plus lieu d'être dans la liste.
        expect(
            screen.queryByRole('region', { name: /9 septembre 2026/ }),
        ).toBeNull();
    });

    it('says in the status column what the client decided, once the report is written', async () => {
        const user = userEvent.setup();
        render(
            <ClientsVisits
                visits={[
                    makeVisit({
                        id: 9,
                        uuid: 'visit-9',
                        scheduled_at: '2026-09-09T13:00:00+00:00',
                        status: 'done',
                        status_label: 'Effectuée',
                        report: 'Le client a aimé la lumière.',
                        report_due: false,
                        outcome: 'applied',
                        outcome_label: 'Dossier déposé',
                    }),
                    makeVisit({
                        id: 10,
                        uuid: 'visit-10',
                        scheduled_at: '2026-09-20T11:00:00+00:00',
                        outcome: 'pending',
                        outcome_label: 'À décider',
                    }),
                ]}
                statuses={visitStatuses}
            />,
        );

        // Une visite racontée sort de la liste des choses à faire : on la
        // retrouve avec « Visites passées ».
        await toggleFilter(user, /Visites passées/);

        // La suite donnée au bien se lit à côté du statut de la visite.
        expect(screen.getByText('Dossier déposé')).toBeInTheDocument();
        // Visite à venir : rien à décider, rien à afficher.
        expect(screen.queryByText('À décider')).toBeNull();
    });
});
