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
    router: { delete: del },
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
    useForm: (initial: Record<string, unknown>) => {
        const [data, setData] = useState(initial);

        return {
            data,
            errors: {} as Record<string, string | undefined>,
            processing: false,
            setData: (key: string | Record<string, unknown>, value?: unknown) =>
                setData((current) =>
                    typeof key === 'string'
                        ? { ...current, [key]: value }
                        : { ...current, ...key },
                ),
            clearErrors: () => undefined,
            post: (url: string, options: unknown) => post(url, data, options),
            patch: (url: string, options: unknown) => patch(url, data, options),
        };
    },
}));

import Team from '@/pages/settings/team';
import { makeTeamMember, staffRoles } from '@/test/fixtures/user';

const members = [
    makeTeamMember(),
    makeTeamMember({
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000e2',
        name: 'Chloé Martin',
        email: 'chloe@example.com',
        role: 'manager',
        role_label: 'Manager',
        two_factor_enabled: true,
        is_me: false,
        can_delete: true,
    }),
];

describe('Team settings page', () => {
    beforeEach(() => {
        post.mockReset();
        del.mockReset();
    });

    it('lists the members with role, 2FA and marks the current user without a remove button', () => {
        render(<Team members={members} roles={staffRoles} />);

        expect(
            screen.getByRole('region', { name: 'Équipe' }),
        ).toHaveTextContent('2 membres ont accès au dashboard');
        const rows = screen.getAllByRole('row').slice(1);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('Admin (vous)');
        expect(rows[0]).toHaveTextContent('Administrateur');
        expect(rows[0]).toHaveTextContent('Sans 2FA');
        expect(
            within(rows[0] as HTMLElement).queryByRole('button', {
                name: /Retirer l’accès/,
            }),
        ).not.toBeInTheDocument();
        expect(rows[1]).toHaveTextContent('Chloé Martin');
        expect(rows[1]).toHaveTextContent('Manager');
        expect(rows[1]).toHaveTextContent('2FA activée');
        expect(
            within(rows[1] as HTMLElement).getByRole('link', {
                name: 'chloe@example.com',
            }),
        ).toHaveAttribute('href', 'mailto:chloe@example.com');
    });

    it('adds a member with a capitalised name, a role and a confirmed password', async () => {
        const user = userEvent.setup();
        render(<Team members={members} roles={staffRoles} />);

        await user.click(
            screen.getByRole('button', { name: 'Ajouter un membre' }),
        );
        const dialog = within(
            await screen.findByRole('dialog', { name: 'Ajouter un membre' }),
        );
        await user.type(dialog.getByLabelText('Nom'), 'jean dupont');
        await user.tab();
        expect(dialog.getByLabelText('Nom')).toHaveValue('Jean Dupont');
        await user.type(
            dialog.getByLabelText('Adresse e-mail'),
            'jean@example.com',
        );
        await user.type(dialog.getByLabelText('Mot de passe'), 'Sup3r-secret');
        await user.type(dialog.getByLabelText('Confirmation'), 'Sup3r-secret');
        await user.click(
            dialog.getByRole('button', { name: 'Ajouter le membre' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/settings/team',
            {
                name: 'Jean Dupont',
                email: 'jean@example.com',
                role: 'member',
                password: 'Sup3r-secret',
                password_confirmation: 'Sup3r-secret',
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows functions and rights, and links each member to their rights page', () => {
        render(
            <Team
                members={[
                    members[0] as (typeof members)[number],
                    makeTeamMember({
                        ...(members[1] as (typeof members)[number]),
                        function_labels: ['Agent de visite'],
                        custom_permissions: true,
                        closed_sections: 2,
                    }),
                ]}
                roles={staffRoles}
            />,
        );

        const rows = screen.getAllByRole('row').slice(1);
        expect(rows[0]).toHaveTextContent('Tous les droits');
        expect(rows[1]).toHaveTextContent('Agent de visite');
        expect(rows[1]).toHaveTextContent('Personnalisés · 2 sections fermées');
        expect(
            within(rows[1] as HTMLElement).getByRole('link', {
                name: 'Droits et fonctions de Chloé Martin',
            }),
        ).toHaveAttribute(
            'href',
            '/settings/team/0199a9a0-0000-7000-8000-0000000000e2',
        );
    });

    it('removes another member after confirmation', async () => {
        const user = userEvent.setup();
        render(<Team members={members} roles={staffRoles} />);

        await user.click(
            screen.getByRole('button', {
                name: 'Retirer l’accès de Chloé Martin',
            }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        expect(
            dialog.getByText(/Retirer l’accès de Chloé Martin \?/),
        ).toBeInTheDocument();
        await user.click(
            dialog.getByRole('button', { name: 'Retirer l’accès' }),
        );

        expect(del).toHaveBeenCalledWith(
            '/settings/team/0199a9a0-0000-7000-8000-0000000000e2',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
