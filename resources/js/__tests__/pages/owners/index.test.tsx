import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del, get } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    get: vi.fn(),
}));

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
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
    useForm: (initial: Record<string, string>) => useFormStub(initial),
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

import OwnersIndex from '@/pages/owners/index';
import { makeOwner, ownerKinds } from '@/test/fixtures/owner';

const owners = [
    makeOwner(),
    makeOwner({
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000d2',
        kind: 'company',
        kind_label: 'Société ou agence',
        name: 'SCI du Marais',
        first_name: 'Ali',
        last_name: 'Bensaïd',
        contact_name: 'Ali Bensaïd',
        company: 'SCI du Marais',
        properties_count: 5,
    }),
];

const pagination = {
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 2,
};
const filters = {
    q: '',
    sort: 'name',
    dir: 'asc' as const,
    kind: [] as string[],
    holding: [] as string[],
};
const listProps = {
    owners,
    kinds: ownerKinds,
    pagination,
    filters,
    kindCounts: { individual: 1, company: 1 },
    holdingCounts: { with: 2, without: 0 },
    propertiesCount: 7,
};

describe('Owners index page', () => {
    beforeEach(() => {
        post.mockClear();
        patch.mockClear();
        del.mockClear();
        get.mockClear();
    });

    it('lists the owners with their kind, contact, address and number of properties', () => {
        render(<OwnersIndex {...listProps} />);

        // L'annuaire annonce les propriétaires et les biens qu'ils détiennent.
        expect(
            screen.getByText('2 propriétaire(s) · 7 bien(s) rattaché(s)'),
        ).toBeInTheDocument();
        expect(screen.getAllByText('zoe@example.com').length).toBeGreaterThan(
            0,
        );
        expect(screen.getByText('Particulier')).toBeInTheDocument();
        expect(screen.getByText('Société ou agence')).toBeInTheDocument();
        // L'interlocuteur d'une société est rappelé sous sa raison sociale.
        expect(screen.getByText('Ali Bensaïd')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '5' })).toHaveAttribute(
            'href',
            '/owners/0199a9a0-0000-7000-8000-0000000000d2',
        );

        // Plus de pipeline : aucun statut de prospection.
        expect(screen.queryByText('À contacter')).not.toBeInTheDocument();
        // Mais un annuaire se filtre et dit quand on a parlé à chacun.
        expect(
            screen.getByRole('button', { name: /Filtres/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: /Dernier échange/ }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Jamais').length).toBe(2);
    });

    it('opens the creation dialog, names an individual and posts', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex {...listProps} />);

        await user.click(
            screen.getByRole('button', { name: 'Nouveau propriétaire' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Nouveau propriétaire',
        });
        expect(
            within(dialog).getByRole('combobox', {
                name: 'Type de propriétaire',
            }),
        ).toHaveTextContent('Particulier');
        expect(
            within(dialog).queryByLabelText('Nombre de biens'),
        ).not.toBeInTheDocument();

        await user.type(within(dialog).getByLabelText('Prénom'), 'paul');
        await user.tab();
        expect(within(dialog).getByLabelText('Prénom')).toHaveValue('Paul');
        await user.type(within(dialog).getByLabelText('Nom'), 'Roux');
        await user.click(
            within(dialog).getByRole('button', {
                name: 'Ajouter le propriétaire',
            }),
        );

        expect(post).toHaveBeenCalledWith(
            '/owners',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('offers no lead action in the row menu: the directory is not a pipeline', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex {...listProps} />);

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Zoé Martin' }),
        );
        expect(
            await screen.findByRole('menuitem', { name: 'Voir la fiche' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: 'Créer le lead' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: 'Supprimer' }),
        ).toBeInTheDocument();
    });

    it('links an owner to its page and edits it from the menu', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex {...listProps} />);

        // Le nom ouvre la fiche ; la modification passe par le menu « ⋯ ».
        expect(
            screen.getByRole('link', { name: 'Zoé Martin' }),
        ).toHaveAttribute(
            'href',
            '/owners/0199a9a0-0000-7000-8000-0000000000d1',
        );
        await user.click(
            screen.getByRole('button', { name: 'Actions pour Zoé Martin' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Modifier' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Modifier Zoé Martin',
        });
        expect(within(dialog).getByLabelText('E-mail')).toHaveValue(
            'zoe@example.com',
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Enregistrer' }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/owners/0199a9a0-0000-7000-8000-0000000000d1',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('filters the directory on the server, by kind and by holding', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex {...listProps} />);

        await user.click(screen.getByRole('button', { name: /Filtres/ }));
        const menu = screen.getByRole('menu');
        for (const title of ['Type', 'Biens']) {
            expect(within(menu).getByText(title)).toBeInTheDocument();
        }

        await user.click(
            within(menu).getByRole('menuitemcheckbox', {
                name: /Sans bien rattaché/,
            }),
        );

        // Le filtre repart au serveur : la liste n'est pas chargée en entier.
        expect(get).toHaveBeenCalledWith(
            '/owners',
            expect.objectContaining({ holding: ['without'] }),
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('imports owners pasted from a spreadsheet', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex {...listProps} />);

        await user.click(screen.getByRole('button', { name: 'Importer' }));
        const dialog = within(
            screen.getByRole('dialog', { name: 'Importer des propriétaires' }),
        );
        await user.type(
            dialog.getByLabelText('Lignes à importer'),
            'Zoé\tMartin\t\tzoe@example.com',
        );

        expect(dialog.getByTestId('import-preview')).toHaveTextContent(
            '1 propriétaire(s) reconnu(s)',
        );
        await user.click(dialog.getByRole('button', { name: /^Importer/ }));

        expect(post).toHaveBeenCalledWith(
            '/owners/import',
            expect.objectContaining({
                rows: [expect.objectContaining({ last_name: 'Martin' })],
            }),
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
