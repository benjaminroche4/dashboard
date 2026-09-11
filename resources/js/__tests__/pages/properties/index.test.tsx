import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del, get } = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: del, post, get },
    usePage: () => ({
        props: {
            auth: { user: { role: 'admin' } },
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

import PropertiesIndex from '@/pages/properties/index';

import { makeProperty, propertyFormOptions } from '@/test/fixtures/property';
import type { PropertyStatus } from '@/types';

const properties = [
    makeProperty(),
    makeProperty({
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000f2',
        title: null,
        label: '3 rue des Martyrs',
        street: '3 rue des Martyrs',
        postal_code: '75009',
        district: 9,
        rent_cents: null,
        agent: null,
        visits_count: 0,
        listing_url: null,
    }),
];

/** Props du mode serveur : la liste des biens est paginée par le serveur. */
const serverProps = (total: number, visited = 0) => ({
    pagination: { current_page: 1, last_page: 1, per_page: 30, total },
    filters: {
        q: '',
        sort: 'created_at',
        dir: 'desc' as const,
        status: [] as PropertyStatus[],
    },
    visitedCount: visited,
    statusCounts: { available: 1, unavailable: 1 } as Partial<
        Record<PropertyStatus, number>
    >,
});

describe('Properties page', () => {
    beforeEach(() => {
        post.mockReset();
        patch.mockReset();
        del.mockReset();
    });

    it('lists the properties in a table with status, features, rent and provenance', () => {
        render(
            <PropertiesIndex
                properties={properties}
                {...propertyFormOptions}
                {...serverProps(2)}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Biens' }),
        ).toBeInTheDocument();
        expect(screen.getByText('2 bien(s)')).toBeInTheDocument();

        for (const title of [
            'Bien',
            'Statut',
            'Caractéristiques',
            'Loyer',
            'Provenance',
        ]) {
            expect(
                screen.getByRole('columnheader', { name: new RegExp(title) }),
            ).toBeInTheDocument();
        }

        const rows = screen.getAllByRole('row').slice(1);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('T2 lumineux · 11e');
        expect(rows[0]).toHaveTextContent('12 rue Oberkampf, 75011 Paris');
        expect(rows[0]).toHaveTextContent('Disponible');
        expect(rows[0]).toHaveTextContent('/ mois');
        // Provenance : l'agence quand l'agent en a une, « Indépendant » sinon.
        expect(rows[0]).toHaveTextContent('Zoé Martin');
        expect(rows[0]).toHaveTextContent(/Indépendant|Agence du Marais/);
        // Sans loyer : la cellule le dit au lieu de rester vide.
        expect(rows[1]).toHaveTextContent('3 rue des Martyrs');
        // Plus de colonne « Visites » : le compte se lit sur la fiche du bien.
        expect(
            screen.queryByRole('columnheader', { name: /Visites/ }),
        ).toBeNull();
        // Le lien vers l'annonce a suivi, à côté du nom du bien.
        expect(
            within(rows[0] as HTMLElement).getByRole('link', {
                name: 'Annonce de T2 lumineux · 11e',
            }),
        ).toHaveAttribute('href', 'https://www.seloger.com/annonces/123.htm');
    });

    it('shows a photo of each property before its name', () => {
        render(
            <PropertiesIndex
                properties={[
                    makeProperty({ photos: ['/storage/properties/a.jpg'] }),
                    properties[1]!,
                ]}
                {...propertyFormOptions}
                {...serverProps(2)}
            />,
        );

        expect(
            screen.getByAltText('Photo de T2 lumineux · 11e'),
        ).toHaveAttribute('src', '/storage/properties/a.jpg');
        // Sans photo : la silhouette du bien, jamais une image cassée.
        expect(screen.queryAllByAltText(/^Photo de /)).toHaveLength(1);
    });

    it('searches and filters through the server, one page at a time', async () => {
        const user = userEvent.setup();
        get.mockClear();
        render(
            <PropertiesIndex
                properties={properties}
                {...propertyFormOptions}
                {...serverProps(2)}
            />,
        );

        // La recherche part au serveur (300 ms après la frappe), jamais en local :
        // l'annuaire peut compter des milliers de biens.
        await user.type(
            screen.getByRole('searchbox', {
                name: 'Rechercher un bien ou une adresse…',
            }),
            'martyrs',
        );
        await waitFor(() =>
            expect(get).toHaveBeenLastCalledWith(
                '/properties',
                expect.objectContaining({ q: 'martyrs' }),
                expect.objectContaining({
                    preserveState: true,
                    only: expect.arrayContaining(['properties']),
                }),
            ),
        );

        // Le filtre de disponibilité aussi, et il revient à la première page.
        await user.click(screen.getByRole('button', { name: /Filtres/ }));
        await user.click(
            await screen.findByRole('menuitemcheckbox', {
                name: /Non disponible/,
            }),
        );
        expect(get).toHaveBeenLastCalledWith(
            '/properties',
            expect.objectContaining({ status: ['unavailable'] }),
            expect.anything(),
        );
    });

    it('shows an empty state without properties', () => {
        render(
            <PropertiesIndex
                properties={[]}
                {...propertyFormOptions}
                {...serverProps(0)}
            />,
        );

        expect(
            screen.getByText('Aucun bien dans l’annuaire pour le moment'),
        ).toBeInTheDocument();
    });

    it('links the add button to the dedicated page', () => {
        render(
            <PropertiesIndex
                properties={[]}
                {...propertyFormOptions}
                {...serverProps(0)}
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Nouveau bien' }),
        ).toHaveAttribute('href', '/properties/create');
    });

    it('links a property to its page and its menu to the dedicated edit page', async () => {
        const user = userEvent.setup();
        render(
            <PropertiesIndex
                properties={properties}
                {...propertyFormOptions}
                {...serverProps(2)}
            />,
        );

        // Le nom ouvre la fiche ; la modification passe par le menu « ⋯ ».
        expect(
            screen.getByRole('link', { name: 'T2 lumineux · 11e' }),
        ).toHaveAttribute(
            'href',
            '/properties/0199a9a0-0000-7000-8000-0000000000f1',
        );
        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour T2 lumineux · 11e',
            }),
        );
        expect(
            await screen.findByRole('menuitem', { name: 'Modifier' }),
        ).toHaveAttribute(
            'href',
            '/properties/0199a9a0-0000-7000-8000-0000000000f1/edit',
        );
    });

    it('lets an admin delete a property after confirmation', async () => {
        const user = userEvent.setup();
        render(
            <PropertiesIndex
                properties={properties}
                {...propertyFormOptions}
                {...serverProps(2)}
            />,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour 3 rue des Martyrs',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Supprimer' }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        await user.click(dialog.getByRole('button', { name: 'Supprimer' }));

        expect(del).toHaveBeenCalledWith(
            '/properties/0199a9a0-0000-7000-8000-0000000000f2',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
