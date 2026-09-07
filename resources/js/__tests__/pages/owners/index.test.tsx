import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
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
import { makeOwner, ownerStatuses } from '@/test/fixtures/owner';

const owners = [
    makeOwner(),
    makeOwner({
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000d2',
        name: 'Ali Bensaïd',
        first_name: 'Ali',
        last_name: 'Bensaïd',
        status: 'interested',
        status_label: 'Intéressé',
        lead: {
            uuid: 'lead-uuid',
            reference: 'LD-0042',
            status_label: 'En cours',
        },
        last_contacted_at: '2026-09-05T10:00:00+00:00',
    }),
];

describe('Owners index page', () => {
    beforeEach(() => {
        post.mockClear();
        patch.mockClear();
        del.mockClear();
    });

    it('lists the owners with status, lead, contact and property, and filters by status', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex owners={owners} statuses={ownerStatuses} />);

        expect(
            screen.getByText('2 propriétaire(s) · 1 à contacter'),
        ).toBeInTheDocument();
        expect(screen.getAllByText('zoe@example.com').length).toBeGreaterThan(
            0,
        );
        expect(
            screen.getAllByText('8 rue de Rivoli, 75004 Paris'),
        ).toHaveLength(2);
        expect(screen.getAllByText('2 bien(s)')).toHaveLength(2);
        expect(screen.getByText('Jamais')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Lead LD-0042 · En cours' }),
        ).toHaveAttribute('href', '/leads/lead-uuid');

        const filter = within(screen.getByLabelText('Filtrer par statut'));
        expect(
            filter.getByRole('radio', { name: /À contacter/ }),
        ).toHaveTextContent('1');
        await user.click(filter.getByRole('radio', { name: /Intéressé/ }));
        expect(
            screen.queryByRole('button', { name: 'Zoé Martin' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Ali Bensaïd' }),
        ).toBeInTheDocument();
    });

    it('opens the creation dialog with the filtered status, requires a name and posts', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex owners={owners} statuses={ownerStatuses} />);

        await user.click(
            screen.getByRole('button', { name: 'Nouveau propriétaire' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Nouveau propriétaire',
        });
        expect(
            within(dialog).getByRole('combobox', { name: 'Statut' }),
        ).toHaveTextContent('À contacter');
        expect(within(dialog).getByLabelText('Nombre de biens')).toHaveValue(1);

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

    it('creates the lead from the row menu, or opens it when it exists', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex owners={owners} statuses={ownerStatuses} />);

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Zoé Martin' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Créer le lead' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/owners/0199a9a0-0000-7000-8000-0000000000d1/convert',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Ali Bensaïd' }),
        );
        expect(
            await screen.findByRole('menuitem', {
                name: 'Ouvrir le lead LD-0042',
            }),
        ).toHaveAttribute('href', '/leads/lead-uuid');
        expect(
            screen.getByRole('menuitem', { name: 'Supprimer' }),
        ).toBeInTheDocument();
    });

    it('edits an owner from its name and patches', async () => {
        const user = userEvent.setup();
        render(<OwnersIndex owners={owners} statuses={ownerStatuses} />);

        await user.click(screen.getByRole('button', { name: 'Zoé Martin' }));
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
});
