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
            counts: {
                leadsTodo: 7,
                ownerLeadsTodo: 2,
                clients: 5,
                visitReports: 3,
                pendingUploads: 0,
                overdueInvoices: 1,
            },
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
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </TooltipProvider>,
        );

        // Le compteur est posé sur l'entrée (`li`), à côté du lien direct.
        const byLink = (href: string) =>
            [...document.querySelectorAll('a')]
                .find((link) => link.getAttribute('href') === href)
                ?.closest('li')
                ?.querySelector('[data-sidebar="menu-badge"]')?.textContent;

        expect(byLink('/locataires')).toBe('7');
        expect(byLink('/owners/leads')).toBe('2');
        localStorage.clear();
    });

    it('names both lead segments in full and lists the directory flat under « Annuaire »', () => {
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
        // Pas de sous-menu sous Leads : la création est un « + » révélé au
        // survol de la ligne, pas une entrée du menu.
        expect(hrefs).not.toContain('/owners/leads/create');
        expect(
            screen.getByRole('link', { name: 'Nouveau lead locataire' }),
        ).toHaveAttribute('href', '/locataires/create');
        expect(
            screen.getByRole('link', { name: 'Nouveau lead propriétaire' }),
        ).toHaveAttribute('href', '/locataires/create?segment=owner');
        expect(
            screen.getByRole('link', { name: 'Planifier une visite' }),
        ).toHaveAttribute('href', '/clients/visits/create');
        expect(
            screen.getByRole('link', { name: 'Nouvelle liste de pièces' }),
        ).toHaveAttribute('href', '/tools/documents/create');
        // Le libellé dit le segment entier : en mode icône comme dans ⌘K,
        // « Propriétaires » seul se confondrait avec l'annuaire.
        expect(
            screen.getByRole('link', { name: 'Leads locataires' }),
        ).toHaveAttribute('href', '/locataires');
        expect(
            screen.getByRole('link', { name: 'Leads propriétaires' }),
        ).toHaveAttribute('href', '/owners/leads');
        expect(
            screen.getByRole('link', { name: 'Propriétaires' }),
        ).toHaveAttribute('href', '/owners');
        // L'annuaire est à plat : plus de menus dépliables à deux entrées.
        for (const [name, href] of [
            ['Agents', '/real-estate/agents'],
            ['Agences', '/real-estate/agencies'],
            ['Partenaires', '/partners'],
            ['Entreprises', '/companies'],
            ['Biens', '/properties'],
        ]) {
            expect(screen.getByRole('link', { name })).toHaveAttribute(
                'href',
                href,
            );
        }
        expect(screen.queryByRole('link', { name: 'Logements' })).toBeNull();
        expect(
            screen.queryByRole('button', {
                name: /(Déplier|Replier) (Agents et agences|Logements)/,
            }),
        ).toBeNull();
        expect(screen.getByText('Annuaire')).toBeInTheDocument();
        expect(screen.queryByText('Réseau')).toBeNull();
    });

    it('keeps the document lists with the clients and one flat « Outils » group', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </TooltipProvider>,
        );

        for (const [name, href] of [
            ['Dossiers', '/clients'],
            ['Visites', '/clients/visits'],
            ['Listes de pièces', '/tools/documents'],
            ['Devis', '/tools/quotes'],
            ['Factures', '/invoices'],
            ['Rapports', '/tools/reports'],
            ["Journal d'activité", '/tools/activity'],
        ]) {
            expect(screen.getByRole('link', { name })).toHaveAttribute(
                'href',
                href,
            );
        }
        // Les groupes, dans l'ordre : les listes de pièces suivent les visites
        // sous Clients, et un seul groupe Outils remplace Facturation et Suivi.
        // Pas de ligne « Rechercher » : la palette ⌘K vit dans l'en-tête.
        expect(screen.queryByRole('button', { name: 'Rechercher' })).toBeNull();
        const groups = [
            ...document.querySelectorAll('[data-sidebar="group"]'),
        ].map((group) => ({
            label: group.querySelector('[data-sidebar="group-label"]')
                ?.textContent,
            // Les liens du menu seuls : les « + » de création ont un aria-label.
            links: [...group.querySelectorAll('a:not([aria-label])')].map(
                (link) => link.textContent?.trim(),
            ),
        }));
        expect(groups.map((group) => group.label)).toEqual([
            undefined,
            'Leads',
            'Clients',
            'Annuaire',
            'Outils',
        ]);
        expect(groups[2].links).toEqual([
            'Dossiers',
            'Visites',
            'Listes de pièces',
        ]);
        expect(groups[4].links).toEqual([
            'Devis',
            'Factures',
            'Rapports',
            "Journal d'activité",
        ]);
        expect(screen.queryByText('Facturation')).toBeNull();
        expect(screen.queryByText('Suivi')).toBeNull();
        // Plus de page /tools : « Outils » n'est qu'un intitulé de groupe.
        expect(
            screen
                .getAllByRole('link')
                .map((link) => link.getAttribute('href')),
        ).not.toContain('/tools');
    });

    it('animates the icon of an entry when its whole row is hovered', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </TooltipProvider>,
        );

        const link = screen.getByRole('link', { name: 'Dossiers' });
        // L'icône animée est un conteneur décoratif autour du SVG, hors du nom accessible.
        const icon = link.querySelector('div[aria-hidden="true"] svg');
        expect(icon).not.toBeNull();
        expect(link).toHaveAttribute('href', '/clients');
    });

    it('hides the sections closed to the member', () => {
        access = Object.fromEntries(
            Object.keys(memberAccess).map((key) => [
                key,
                ['visits', 'invoices'].includes(key) ? 'write' : 'none',
            ]),
        );
        try {
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
            expect(names).toContain('Aujourd’hui');
            expect(names).toContain('Visites');
            expect(names).toContain('Factures');
            expect(names).not.toContain('Dossiers');
            expect(names).not.toContain('Partenaires');
            expect(names).not.toContain('Rapports');
            // Les groupes vidés disparaissent avec leur libellé.
            expect(screen.queryByText('Annuaire')).toBeNull();
            expect(screen.queryByText('Leads')).toBeNull();
            expect(screen.getByText('Clients')).toBeInTheDocument();
            expect(screen.getByText('Outils')).toBeInTheDocument();
        } finally {
            access = null;
        }
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
        expect(links[0]).toHaveTextContent('Aujourd’hui');
        expect(links[0]).toHaveAttribute('href', '/dashboard');
        expect(
            document
                .querySelector('[data-sidebar="group"]')
                ?.querySelector('[data-sidebar="group-label"]'),
        ).toBeNull();
    });

    it('shows what awaits as a coloured badge and the dossiers total in grey', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </TooltipProvider>,
        );

        const badgeOf = (name: string) =>
            screen
                .getByRole('link', { name })
                .closest('li')
                ?.querySelector('[data-sidebar="menu-badge"]');

        // Un total, en gris : il n'appelle rien.
        expect(badgeOf('Dossiers')).toHaveTextContent('5');
        expect(badgeOf('Dossiers')).toHaveAttribute('data-tone', 'total');
        // Ce qui attend une action, en couleur.
        expect(badgeOf('Leads locataires')).toHaveTextContent('7');
        expect(badgeOf('Leads locataires')).toHaveAttribute(
            'data-tone',
            'alert',
        );
        // Visites et Factures n'ont pas de compteur : leurs retards se lisent sur la page.
        expect(badgeOf('Visites')).toBeNull();
        expect(badgeOf('Factures')).toBeNull();
        // Zéro : pas de pastille.
        expect(badgeOf('Listes de pièces')).toBeNull();
    });

    it('hides the create button of a segment the member cannot create', () => {
        access = { ...memberAccess, leads_create: 'none' };
        try {
            render(
                <TooltipProvider>
                    <SidebarProvider>
                        <AppSidebar />
                    </SidebarProvider>
                </TooltipProvider>,
            );

            expect(
                screen.getByRole('link', { name: 'Leads locataires' }),
            ).toBeInTheDocument();
            expect(
                screen.queryByRole('link', { name: 'Nouveau lead locataire' }),
            ).toBeNull();
            expect(
                screen.getByRole('link', { name: 'Nouveau lead propriétaire' }),
            ).toBeInTheDocument();
        } finally {
            access = null;
        }
    });
});
