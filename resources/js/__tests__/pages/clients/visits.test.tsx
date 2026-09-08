import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { propertyFormOptions } from '@/test/fixtures/property';
import { makeVisit, visitStatuses } from '@/test/fixtures/visit';

const clients = [
    { id: 1, uuid: 'client-1', name: 'Léa Durand', reference: 'LD-4821' },
    { id: 2, uuid: 'client-2', name: 'Paul Roux', reference: 'LD-4822' },
];
const properties = [
    {
        id: 1,
        label: 'T2 lumineux · 11e',
        street: '12 rue Oberkampf',
        postal_code: '75011',
        city: 'Paris',
    },
];
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
        },
        agent: null,
    }),
];

function renderPage(list = visits) {
    return render(
        <ClientsVisits
            visits={list}
            statuses={visitStatuses}
            clients={clients}
            properties={properties}
            {...propertyFormOptions}
        />,
    );
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
            screen.getByText('2 visite(s) · 1 planifiée(s)'),
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
        expect(
            sections.map((section) => section.getAttribute('data-day')),
        ).toEqual(['2026-09-15', '2026-09-01']);
        const today = within(sections[0] as HTMLElement);
        expect(today.getByRole('heading')).toHaveTextContent(
            "Aujourd'hui · mardi 15 septembre 2026",
        );
        const rows = today.getAllByRole('row').slice(1);
        expect(rows).toHaveLength(1);
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
        expect(sections[1]).toHaveTextContent('Effectuée');

        await user.click(screen.getByRole('radio', { name: /Effectuée/ }));
        expect(
            screen
                .getAllByRole('region')
                .filter((section) => section.hasAttribute('data-day')),
        ).toHaveLength(1);
        // La carte ne dépend pas des filtres de la liste.
        expect(
            screen.getByRole('region', { name: 'Visites du jour' }),
        ).toHaveTextContent('Léa Durand');

        await user.click(screen.getByRole('radio', { name: /Toutes/ }));
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
                },
            }),
        ]);

        expect(screen.getByText('Compte rendu à rédiger')).toHaveAttribute(
            'data-report',
            'due',
        );
        expect(screen.getByText('Compte rendu')).toHaveAttribute(
            'data-report',
            'done',
        );

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
        await user.click(
            dialog.getByRole('button', { name: 'Enregistrer le compte rendu' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/clients/visits/visit-due/report',
            { report: 'Très bon accueil, cuisine un peu petite.' },
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
        window.history.replaceState({}, '', '/clients/visits');
    });

    it('links the schedule button to the dedicated page', () => {
        renderPage();

        expect(
            screen.getByRole('link', { name: 'Planifier une visite' }),
        ).toHaveAttribute('href', '/clients/visits/create');
    });
});
