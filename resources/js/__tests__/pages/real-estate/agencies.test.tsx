import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del, role } = vi.hoisted(() => ({
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
    router: { delete: del },
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
        expect(screen.getAllByText('—')).toHaveLength(2);
        expect(screen.getAllByText('Admin')).toHaveLength(2);
    });

    it('opens the agents of an agency and adds one with the agency preselected', async () => {
        const user = userEvent.setup();
        render(<Agencies agencies={[makeAgency()]} />);

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
        render(<Agencies agencies={[makeAgency()]} />);

        await user.click(
            screen.getByRole('button', { name: 'Nouvelle agence' }),
        );
        const dialog = screen.getByRole('dialog', { name: 'Nouvelle agence' });
        await user.type(
            within(dialog).getByLabelText('Nom'),
            'Bureau Paris Ouest',
        );
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
        render(<Agencies agencies={[makeAgency()]} />);

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
        render(<Agencies agencies={[makeAgency({ id: 3, name: 'Autre' })]} />);

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
});
