import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del, setData } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    setData: vi.fn(),
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
    router: { delete: del, post },
    usePage: () => ({
        props: {
            auth: { user: { role: 'admin' } },
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
        setData: (key: string | Record<string, string>, value?: string) => {
            setData(key, value);
            setDataState((current) =>
                typeof key === 'string'
                    ? { ...current, [key]: value ?? '' }
                    : { ...current, ...key },
            );
        },
        clearErrors: () => undefined,
        post,
        patch,
    };
}

import Agents from '@/pages/real-estate/agents';
import { agencyOptions, makeAgent } from '@/test/fixtures/real-estate';

describe('Agents page', () => {
    beforeEach(() => {
        post.mockClear();
        patch.mockClear();
        del.mockClear();
        setData.mockClear();
    });

    it('lists the agents with their agency, position and contact', () => {
        render(
            <Agents
                agents={[
                    makeAgent({
                        street: '5 rue de Bretagne',
                        postal_code: '75003',
                        city: 'Paris',
                    }),
                    makeAgent({
                        id: 2,
                        uuid: '0199a9a0-0000-7000-8000-0000000000b2',
                        name: 'Ali Bensaïd',
                        first_name: 'Ali',
                        last_name: 'Bensaïd',
                        position: null,
                        agency: null,
                        email: null,
                        phone: null,
                    }),
                ]}
                agencies={agencyOptions}
            />,
        );

        expect(
            screen.getByText('2 agent(s) immobilier(s)'),
        ).toBeInTheDocument();
        expect(screen.getByText('Négociateur')).toBeInTheDocument();
        expect(screen.getByText('Agence du Marais')).toBeInTheDocument();
        expect(screen.getByText('Indépendant')).toBeInTheDocument();
        expect(screen.getAllByText('Admin')).toHaveLength(2);
        expect(
            screen.getByRole('button', { name: 'Importer' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('5 rue de Bretagne, 75003 Paris'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: '+33 6 12 34 56 78' }),
        ).toHaveAttribute('href', 'tel:+33612345678');
    });

    it('adds an agent with capitalised names and edits one with its agency preselected', async () => {
        const user = userEvent.setup();
        render(<Agents agents={[makeAgent()]} agencies={agencyOptions} />);

        await user.click(screen.getByRole('button', { name: 'Nouvel agent' }));
        const dialog = screen.getByRole('dialog', { name: 'Nouvel agent' });
        const firstName = within(dialog).getByLabelText('Prénom');
        await user.type(firstName, 'jean-pierre');
        await user.tab();
        expect(setData).toHaveBeenCalledWith('first_name', 'Jean-Pierre');
        await user.type(within(dialog).getByLabelText('Nom'), 'Durand');

        // L'e-mail de bienvenue : décoché par défaut, et seulement avec un e-mail.
        const notify = within(dialog).getByRole('checkbox', {
            name: /Prévenir l’agent par e-mail/,
        });
        expect(notify).toBeDisabled();
        await user.type(
            within(dialog).getByLabelText('E-mail'),
            'jp@example.com',
        );
        expect(notify).toBeEnabled();
        expect(notify).not.toBeChecked();

        await user.click(
            within(dialog).getByRole('button', { name: 'Ajouter l’agent' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/real-estate/agents',
            expect.objectContaining({ preserveScroll: true }),
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Annuler' }),
        );

        expect(
            screen.getByRole('link', { name: 'Zoé Martin' }),
        ).toHaveAttribute(
            'href',
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1',
        );
        await user.click(
            screen.getByRole('button', { name: 'Actions pour Zoé Martin' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
        const editDialog = screen.getByRole('dialog', {
            name: 'Modifier Zoé Martin',
        });
        expect(within(editDialog).getByLabelText('Nom')).toHaveValue('Martin');
        expect(
            within(editDialog).getByRole('combobox', { name: 'Agence' }),
        ).toHaveTextContent('Agence du Marais');
        await user.click(
            within(editDialog).getByRole('button', { name: 'Enregistrer' }),
        );
        expect(patch).toHaveBeenCalledWith(
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows a star per agent and restricts the list to the favorites', async () => {
        const user = userEvent.setup();
        render(
            <Agents
                agents={[
                    makeAgent({ is_favorite: true }),
                    makeAgent({
                        id: 2,
                        uuid: '0199a9a0-0000-7000-8000-0000000000b2',
                        name: 'Ali Bensaïd',
                        first_name: 'Ali',
                        last_name: 'Bensaïd',
                        agency: null,
                    }),
                ]}
                agencies={agencyOptions}
            />,
        );

        expect(
            screen.getByRole('button', {
                name: 'Retirer Zoé Martin des favoris',
            }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('button', {
                name: 'Ajouter Ali Bensaïd aux favoris',
            }),
        ).toHaveAttribute('aria-pressed', 'false');

        const filter = screen.getByRole('button', { name: 'Favoris (1)' });
        await user.click(filter);
        expect(filter).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('link', { name: 'Zoé Martin' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Ali Bensaïd' }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', {
                name: 'Retirer Zoé Martin des favoris',
            }),
        );
        expect(post).toHaveBeenCalledWith(
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1/favorite',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );

        await user.click(filter);
        expect(
            screen.getByRole('link', { name: 'Ali Bensaïd' }),
        ).toBeInTheDocument();
    });
});
