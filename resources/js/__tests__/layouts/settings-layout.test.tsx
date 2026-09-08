import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makeUser } from '@/test/fixtures/user';

const page = vi.hoisted(() => ({
    url: '/settings/profile',
    can: { manageStaff: false } as { manageStaff: boolean },
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
        className?: string;
        'aria-current'?: 'page';
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
    usePage: () => ({
        url: page.url,
        props: { auth: { user: makeUser(), can: page.can } },
    }),
}));

import SettingsLayout from '@/layouts/settings/layout';

describe('Settings layout', () => {
    it('shows the page header with the current user and the three sections', () => {
        render(
            <SettingsLayout>
                <p>Contenu</p>
            </SettingsLayout>,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Paramètres',
        );
        expect(
            screen.getByText(/Admin · Administrateur · admin@admin.fr/),
        ).toBeInTheDocument();

        const nav = screen.getByRole('navigation', { name: 'Paramètres' });
        const links = nav.querySelectorAll('a');

        expect([...links].map((link) => link.textContent)).toEqual([
            'ProfilNom et adresse e-mail',
            'SécuritéMot de passe, 2FA, clés d’accès',
            'ApparenceThème clair ou sombre',
        ]);
        expect(screen.getByText('Contenu')).toBeInTheDocument();
    });

    it('adds the Équipe section for admins only', () => {
        page.can = { manageStaff: true };
        render(
            <SettingsLayout>
                <p>Contenu</p>
            </SettingsLayout>,
        );

        const link = screen.getByRole('link', { name: /Équipe/ });
        expect(link).toHaveAttribute('href', '/settings/team');
        expect(link).toHaveTextContent('Membres ayant accès au dashboard');
        page.can = { manageStaff: false };
    });

    it('marks the current section', () => {
        page.url = '/settings/security';
        render(
            <SettingsLayout>
                <p>Contenu</p>
            </SettingsLayout>,
        );

        const current = screen.getByRole('link', { current: 'page' });

        expect(current).toHaveTextContent('Sécurité');
        expect(current).toHaveClass('bg-sidebar', 'font-medium');
        expect(
            screen.getByRole('link', { name: /Profil/ }),
        ).not.toHaveAttribute('aria-current');
    });
});
