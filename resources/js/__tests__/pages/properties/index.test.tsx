import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: del, post },
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

describe('Properties page', () => {
    beforeEach(() => {
        post.mockReset();
        patch.mockReset();
        del.mockReset();
    });

    it('shows one card per property with its cover photo, rent, address, features, agent and visits', () => {
        render(
            <PropertiesIndex
                properties={[
                    makeProperty({
                        photos: [
                            '/storage/properties/a.jpg',
                            '/storage/properties/b.jpg',
                        ],
                    }),
                    properties[1]!,
                ]}
                {...propertyFormOptions}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Biens' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('2 bien(s) · 1 déjà visité(s)'),
        ).toBeInTheDocument();
        const cards = screen.getAllByTestId('property-card');
        expect(cards).toHaveLength(2);

        const first = within(cards[0] as HTMLElement);
        expect(
            first.getByRole('img', { name: 'Photo de T2 lumineux · 11e' }),
        ).toHaveAttribute('src', '/storage/properties/a.jpg');
        expect(cards[0]).toHaveTextContent('2'); // nombre de photos
        expect(cards[0]).toHaveTextContent('11e');
        expect(cards[0]).toHaveTextContent('/ mois');
        expect(cards[0]).toHaveTextContent('de charges');
        expect(cards[0]).toHaveTextContent('12 rue Oberkampf, 75011 Paris');
        // Type et meublé en badges, le reste en ligne discrète.
        expect(first.getByText('T2')).toBeInTheDocument();
        expect(first.getByText('Meublé')).toBeInTheDocument();
        expect(cards[0]).toHaveTextContent('42 m² · 2 pièce(s) · 3e étage');
        expect(first.getByRole('link', { name: /Zoé Martin/ })).toHaveAttribute(
            'href',
            '/real-estate/agents/agent-uuid',
        );
        expect(first.getByLabelText('2 visites')).toBeInTheDocument();
        expect(
            first.getByRole('link', { name: 'Ouvrir l’annonce' }),
        ).toHaveAttribute('href', 'https://www.seloger.com/annonces/123.htm');

        // Sans photo ni loyer : silhouette et mention explicite.
        const second = within(cards[1] as HTMLElement);
        expect(
            second.getByRole('img', { name: 'Aucune photo' }),
        ).toBeInTheDocument();
        expect(cards[1]).toHaveTextContent('Loyer non renseigné');
        expect(cards[1]).toHaveTextContent('Sans agent');
        expect(PropertiesIndex.layout.breadcrumbs[1]?.href.url).toBe(
            '/properties',
        );
    });

    it('filters the cards by label or address and shows an empty state without properties', async () => {
        const user = userEvent.setup();
        const { unmount } = render(
            <PropertiesIndex
                properties={properties}
                {...propertyFormOptions}
            />,
        );

        await user.type(
            screen.getByRole('textbox', {
                name: 'Filtrer par bien ou adresse',
            }),
            'martyrs',
        );
        const cards = screen.getAllByTestId('property-card');
        expect(cards).toHaveLength(1);
        expect(cards[0]).toHaveTextContent('3 rue des Martyrs');
        unmount();

        render(<PropertiesIndex properties={[]} {...propertyFormOptions} />);
        expect(
            screen.getByText('Aucun bien dans l’annuaire pour le moment'),
        ).toBeInTheDocument();
    });

    it('shows the availability badge on each card and filters by status', async () => {
        const user = userEvent.setup();
        render(
            <PropertiesIndex
                properties={[
                    makeProperty(),
                    makeProperty({
                        id: 2,
                        uuid: 'property-2',
                        title: 'Studio · 5e',
                        label: 'Studio · 5e',
                        status: 'unavailable',
                        status_label: 'Non disponible',
                    }),
                ]}
                {...propertyFormOptions}
            />,
        );

        const cards = screen.getAllByTestId('property-card');
        expect(
            within(cards[0] as HTMLElement).getByText('Disponible'),
        ).toHaveAttribute('data-status', 'available');
        expect(
            within(cards[1] as HTMLElement).getByText('Non disponible'),
        ).toHaveAttribute('data-status', 'unavailable');

        await user.click(screen.getByRole('button', { name: 'Filtres' }));
        await user.click(
            await screen.findByRole('menuitemcheckbox', {
                name: /Non disponible/,
            }),
        );
        await user.keyboard('{Escape}');

        const filtered = screen.getAllByTestId('property-card');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]).toHaveTextContent('Studio · 5e');
    });

    it('links the add button to the dedicated page', () => {
        render(<PropertiesIndex properties={[]} {...propertyFormOptions} />);

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
