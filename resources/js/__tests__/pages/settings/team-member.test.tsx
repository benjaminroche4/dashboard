import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

let transform: (data: Record<string, unknown>) => unknown = (data) => data;

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
            transform: (fn: (data: Record<string, unknown>) => unknown) => {
                transform = fn;
            },
            patch: (url: string, options: unknown) =>
                patch(url, transform(data), options),
        };
    },
}));

import TeamMemberPage from '@/pages/settings/team-member';
import {
    accessLevels,
    makeTeamMemberAccess,
    roleDefaults,
    siteSections,
    staffFunctions,
    staffRoles,
} from '@/test/fixtures/user';

function renderPage(member = makeTeamMemberAccess()) {
    return render(
        <TeamMemberPage
            member={member}
            roles={staffRoles}
            sections={siteSections}
            levels={accessLevels}
            functionOptions={staffFunctions}
            roleDefaults={roleDefaults}
        />,
    );
}

describe('Team member rights page', () => {
    beforeEach(() => {
        patch.mockReset();
        transform = (data) => data;
    });

    it('shows the member, one level per section with the role defaults, and saves the changed levels and functions', async () => {
        const user = userEvent.setup();
        renderPage();

        expect(
            screen.getByRole('region', {
                name: 'Droits et fonctions de Chloé Martin',
            }),
        ).toHaveTextContent('chloe@example.com');
        expect(
            screen.getByRole('combobox', { name: 'Rôle' }),
        ).toHaveTextContent('Membre');

        const invoices = within(screen.getByLabelText('Niveau pour Factures'));
        expect(
            invoices.getByRole('radio', { name: 'Consulter' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(screen.queryByText('Personnalisé')).toBeNull();

        await user.click(invoices.getByRole('radio', { name: 'Modifier' }));
        expect(screen.getByText('Personnalisé')).toBeInTheDocument();
        expect(screen.getByText(/1 section personnalisée/)).toBeInTheDocument();

        const leads = within(
            screen.getByLabelText('Niveau pour Leads locataires'),
        );
        await user.click(leads.getByRole('radio', { name: 'Aucun accès' }));
        expect(screen.getByText(/1 fermée/)).toBeInTheDocument();

        await user.click(screen.getByLabelText('Agent de visite'));
        await user.click(
            screen.getByRole('button', { name: 'Enregistrer les droits' }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/settings/team/0199a9a0-0000-7000-8000-0000000000e2/access',
            expect.objectContaining({
                role: 'member',
                permissions: expect.objectContaining({
                    invoices: 'write',
                    leads: 'none',
                    clients: 'write',
                }),
                functions: ['visits'],
            }),
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('applies every level at once, returns to the role defaults, and restarts from the new role defaults', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole('button', { name: 'Tout consulter' }),
        );
        expect(screen.getByText(/15 en consultation/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Droits du rôle' }),
        ).toBeEnabled();

        await user.click(
            screen.getByRole('button', { name: 'Droits du rôle' }),
        );
        expect(screen.queryByText('Personnalisé')).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Droits du rôle' }),
        ).toBeDisabled();

        await user.click(screen.getByRole('combobox', { name: 'Rôle' }));
        await user.click(
            await screen.findByRole('option', { name: 'Manager' }),
        );
        const invoices = within(screen.getByLabelText('Niveau pour Factures'));
        expect(
            invoices.getByRole('radio', { name: 'Modifier' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText(/Ceux du rôle Manager/)).toBeInTheDocument();
    });

    it('locks the matrix for an administrator and sends no permissions', async () => {
        const user = userEvent.setup();
        renderPage(
            makeTeamMemberAccess({
                role: 'admin',
                role_label: 'Administrateur',
                access: roleDefaults.admin,
                is_me: true,
                can_change_role: false,
            }),
        );

        expect(
            screen.getByText(
                'Un administrateur a tous les droits sur toutes les sections.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Rôle' })).toBeDisabled();
        expect(
            screen.getByText('Vous ne pouvez pas changer votre propre rôle.'),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Tout consulter' }),
        ).toBeNull();

        await user.click(screen.getByLabelText('Facturation'));
        await user.click(
            screen.getByRole('button', { name: 'Enregistrer les droits' }),
        );

        expect(patch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                role: 'admin',
                permissions: null,
                functions: ['billing'],
            }),
            expect.anything(),
        );
    });
});
