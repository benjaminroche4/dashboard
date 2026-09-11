import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del, role, get } = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    role: { value: 'admin' },
}));

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
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
    router: { delete: del, post, get },
    usePage: () => ({
        props: {
            auth: { user: { role: role.value } },
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, string>) => useFormStub(initial),
}));

function useFormStub(initial: Record<string, string>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {} as Record<string, string | undefined>,
        processing: false,
        setData: (key: string | Record<string, string>, value?: string) =>
            setDataState((current) =>
                typeof key === 'string'
                    ? { ...current, [key]: value ?? '' }
                    : { ...current, ...key },
            ),
        clearErrors: () => undefined,
        post,
        patch,
    };
}

import Agencies from '@/pages/real-estate/agencies';
import { makeAgency } from '@/test/fixtures/real-estate';

/** Props du mode serveur : la liste est paginée par le serveur. */
const serverProps = (total: number) => ({
    pagination: { current_page: 1, last_page: 1, per_page: 50, total },
    filters: { q: '', sort: 'name', dir: 'asc' as const, favorites: '' },
    favoritesCount: 1,
});

describe('Agencies page', () => {
    beforeEach(() => {
        post.mockClear();
        patch.mockClear();
        del.mockClear();
        role.value = 'admin';
    });

    it('lists the agencies with address, contact and agent count', () => {
        render(
            <Agencies
                agencies={[
                    makeAgency(),
                    makeAgency({
                        id: 2,
                        uuid: '0199a9a0-0000-7000-8000-0000000000a2',
                        name: 'Bureau Paris Ouest',
                        street: null,
                        postal_code: null,
                        city: null,
                        email: null,
                        phone: null,
                        website: null,
                        agents_count: 0,
                    }),
                ]}
                {...serverProps(2)}
            />,
        );

        expect(
            screen.getByText('2 agence(s) partenaire(s)'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('12 rue de Turenne, 75003 Paris'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'contact@marais.example' }),
        ).toHaveAttribute('href', 'mailto:contact@marais.example');
        expect(
            screen.getByRole('link', { name: 'marais.example' }),
        ).toHaveAttribute('href', 'https://marais.example');
        // Deux tirets par agence sans donnée : contact manquant et dernier échange.
        expect(screen.getAllByText('—')).toHaveLength(4);
        expect(screen.getAllByText('Admin')).toHaveLength(2);
    });

    it('opens the agents of an agency and adds one with the agency preselected', async () => {
        const user = userEvent.setup();
        render(<Agencies agencies={[makeAgency()]} {...serverProps(2)} />);

        await user.click(
            screen.getByRole('button', {
                name: '2 agent(s) de Agence du Marais',
            }),
        );
        expect(screen.getByText('Zoé Martin')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Ajouter un agent' }),
        );

        const dialog = screen.getByRole('dialog', { name: 'Nouvel agent' });
        expect(
            within(dialog).getByRole('combobox', { name: 'Agence' }),
        ).toHaveTextContent('Agence du Marais');
    });

    it('opens the dialog to add, then to edit, and posts to the right route', async () => {
        const user = userEvent.setup();
        render(<Agencies agencies={[makeAgency()]} {...serverProps(2)} />);

        await user.click(
            screen.getByRole('button', { name: 'Nouvelle agence' }),
        );
        const dialog = screen.getByRole('dialog', { name: 'Nouvelle agence' });
        await user.type(
            within(dialog).getByLabelText('Nom'),
            'Bureau Paris Ouest',
        );

        // L'e-mail de bienvenue : décoché par défaut, et seulement avec un e-mail.
        const notify = within(dialog).getByRole('checkbox', {
            name: /Prévenir l’agence par e-mail/,
        });
        expect(notify).toBeDisabled();
        await user.type(
            within(dialog).getByLabelText('E-mail'),
            'contact@ouest.example',
        );
        expect(notify).toBeEnabled();
        expect(notify).not.toBeChecked();

        await user.click(
            within(dialog).getByRole('button', { name: 'Ajouter l’agence' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/real-estate/agencies',
            expect.objectContaining({ preserveScroll: true }),
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Annuler' }),
        );

        expect(
            screen.getByRole('link', { name: 'Agence du Marais' }),
        ).toHaveAttribute(
            'href',
            '/real-estate/agencies/0199a9a0-0000-7000-8000-0000000000a1',
        );
        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour Agence du Marais',
            }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
        const editDialog = screen.getByRole('dialog', {
            name: 'Modifier Agence du Marais',
        });
        expect(within(editDialog).getByLabelText('Nom')).toHaveValue(
            'Agence du Marais',
        );
        expect(within(editDialog).getByLabelText('Code postal')).toHaveValue(
            '75003',
        );
        await user.click(
            within(editDialog).getByRole('button', { name: 'Enregistrer' }),
        );
        expect(patch).toHaveBeenCalledWith(
            '/real-estate/agencies/0199a9a0-0000-7000-8000-0000000000a1',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('lets admins delete after confirmation', async () => {
        const user = userEvent.setup();
        render(<Agencies agencies={[makeAgency()]} {...serverProps(2)} />);

        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour Agence du Marais',
            }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Supprimer' }));
        await user.click(
            within(
                screen.getByRole('dialog', {
                    name: 'Supprimer l’agence Agence du Marais ?',
                }),
            ).getByRole('button', { name: 'Supprimer' }),
        );
        expect(del).toHaveBeenCalledWith(
            '/real-estate/agencies/0199a9a0-0000-7000-8000-0000000000a1',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('hides deletion from members', async () => {
        const user = userEvent.setup();
        role.value = 'member';
        render(
            <Agencies
                agencies={[makeAgency({ id: 3, name: 'Autre' })]}
                {...serverProps(2)}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Autre' }),
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Supprimer' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: 'Modifier' }),
        ).toBeInTheDocument();
    });

    it('shows a star per agency and restricts the list to the favorites', async () => {
        const user = userEvent.setup();
        render(
            <Agencies
                agencies={[
                    makeAgency({ is_favorite: true }),
                    makeAgency({
                        id: 2,
                        uuid: '0199a9a0-0000-7000-8000-0000000000a2',
                        name: 'Bureau Paris Ouest',
                        website: null,
                    }),
                ]}
                {...serverProps(2)}
            />,
        );

        // L'étoile signale le favori à côté du nom ; la bascule est dans le menu « ⋯ ».
        expect(screen.getAllByRole('img', { name: 'Favori' })).toHaveLength(1);

        // Le filtre « Favoris » est un filtre serveur : il repart en visite.
        await user.click(screen.getByRole('button', { name: 'Favoris (1)' }));
        expect(get).toHaveBeenCalledWith(
            '/real-estate/agencies',
            expect.objectContaining({ favorites: '1' }),
            expect.objectContaining({ preserveState: true }),
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour Agence du Marais',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Favoris' }),
        );
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/favorite'),
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
