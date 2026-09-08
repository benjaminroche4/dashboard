import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

let access: Record<string, string> | null = null;

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        prefetch: _prefetch,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
        prefetch?: boolean;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
    usePage: () => ({
        url: '/dashboard',
        props: {
            name: 'Dashboard',
            auth: { user: { id: 1, name: 'Admin', role: 'admin' }, access },
            counts: { leadsTodo: 7, ownerLeadsTodo: 2 },
        },
    }),
    router: { visit: vi.fn() },
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-current-url', () => ({
    useCurrentUrl: () => ({
        currentUrl: '/dashboard',
        isCurrentUrl: () => false,
    }),
}));
vi.mock('@/components/workspace-switcher', () => ({
    WorkspaceSwitcher: () => null,
}));
vi.mock('@/components/nav-user', () => ({ NavUser: () => null }));

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { memberAccess } from '@/test/fixtures/user';

describe('AppSidebar', () => {
    it('shows the number of leads to handle on both lead lists', () => {
        localStorage.setItem('sidebar.branch.Locataires', '1');
        localStorage.setItem('sidebar.branch.Leads propriétaires', '1');
        localStorage.setItem('sidebar.branch.Réseau propriétaires', '1');
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </TooltipProvider>,
        );

        const badges = [
            ...document.querySelectorAll('[data-sidebar="menu-badge"]'),
        ];
        const byLink = (href: string) =>
            badges.find(
                (badge) => badge.closest('a')?.getAttribute('href') === href,
            )?.textContent;

        expect(byLink('/locataires')).toBe('7');
        expect(byLink('/owners/leads')).toBe('2');
        localStorage.clear();
    });

    it('offers the owner converting machine and keeps the owner directory in the network group', () => {
        localStorage.setItem('sidebar.branch.Leads propriétaires', '1');
        localStorage.setItem('sidebar.branch.Réseau propriétaires', '1');
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </TooltipProvider>,
        );

        const hrefs = screen
            .getAllByRole('link')
            .map((link) => link.getAttribute('href'));
        expect(hrefs).toContain('/owners/leads/create');
        expect(hrefs).toContain('/owners');
        // « Propriétaires » : le menu des leads propriétaires, et la page de l'annuaire dans Réseau.
        expect(
            screen.getAllByRole('link', { name: 'Propriétaires' }),
        ).toHaveLength(2);
        // Réseau : un seul menu « Propriétaires et biens » avec les deux pages.
        expect(
            screen.getByRole('link', { name: 'Propriétaires et biens' }),
        ).toHaveAttribute('href', '/owners');
        expect(screen.getByRole('link', { name: 'Biens' })).toHaveAttribute(
            'href',
            '/properties',
        );
        expect(
            screen.queryByRole('link', { name: 'Biens et propriétaires' }),
        ).not.toBeInTheDocument();
        localStorage.clear();
    });

    it('hides the sections closed to the member', () => {
        access = Object.fromEntries(
            Object.keys(memberAccess).map((key) => [
                key,
                ['visits', 'invoices'].includes(key) ? 'write' : 'none',
            ]),
        );
        localStorage.setItem('sidebar.branch.Clients', '1');
        localStorage.setItem('sidebar.branch.Outils', '1');
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </TooltipProvider>,
        );

        const names = screen
            .getAllByRole('link')
            .map((link) => link.textContent?.trim());
        expect(names).toContain('Tableau de bord');
        expect(names).toContain('Visites');
        expect(names).toContain('Factures');
        expect(names).toContain('Tous les outils');
        expect(names).not.toContain('Dossiers clients');
        expect(names).not.toContain('Partenaires');
        expect(names).not.toContain('Rapports');
        expect(screen.queryByText('Réseau')).toBeNull();
        access = null;
        localStorage.clear();
    });

    it('puts the dashboard alone at the very top, without a group label', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </TooltipProvider>,
        );

        const links = screen.getAllByRole('link');
        expect(links[0]).toHaveTextContent('Tableau de bord');
        expect(links[0]).toHaveAttribute('href', '/dashboard');
        expect(
            document
                .querySelector('[data-sidebar="group"]')
                ?.querySelector('[data-sidebar="group-label"]'),
        ).toBeNull();
    });
});
