import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

        expect(byLink('/locataires')).toBe('7 en attente');
        expect(byLink('/owners/leads')).toBe('2 en attente');
        localStorage.clear();
    });

    it('names both lead segments in full and folds the directory into one « Annuaire » tree menu', async () => {
        const user = userEvent.setup();
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
        // Pas de sous-menu ni de « + » sous Leads : chaque liste porte son
        // bouton de création, le menu ne mène qu'aux listes.
        expect(hrefs).not.toContain('/owners/leads/create');
        expect(hrefs).not.toContain('/locataires/create');
        expect(hrefs).not.toContain('/clients/visits/create');
        expect(hrefs).not.toContain('/tools/documents/create');
        // Le libellé dit le segment entier : en mode icône comme dans ⌘K,
        // « Propriétaires » seul se confondrait avec l'annuaire.
        expect(
            screen.getByRole('link', { name: 'Leads locataires' }),
        ).toHaveAttribute('href', '/locataires');
        expect(
            screen.getByRole('link', { name: 'Leads propriétaires' }),
        ).toHaveAttribute('href', '/owners/leads');
        // L'annuaire est un seul menu déroulant, fermé au départ : ses six
        // liens n'existent qu'une fois ouvert, en arbre.
        expect(screen.queryByRole('link', { name: 'Agents' })).toBeNull();
        const directory = screen.getByRole('button', { name: 'Annuaire' });
        expect(directory).toHaveAttribute('aria-expanded', 'false');
        await user.click(directory);
        for (const [name, href] of [
            ['Agents', '/real-estate/agents'],
            ['Agences', '/real-estate/agencies'],
            ['Partenaires', '/partners'],
            ['Entreprises', '/companies'],
            ['Propriétaires', '/owners'],
            ['Biens', '/properties'],
        ]) {
            const link = screen.getByRole('link', { name });
            expect(link).toHaveAttribute('href', href);
            expect(link.closest('li')).toHaveAttribute('data-tree-branch');
        }
        expect(screen.queryByRole('link', { name: 'Logements' })).toBeNull();
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
            // Les liens du groupe ; le menu « Annuaire » (fermé) est un bouton,
            // ses sous-liens ne comptent pas ici.
            links: [...group.querySelectorAll('a')].map((link) =>
                link.textContent?.trim(),
            ),
        }));
        expect(groups.map((group) => group.label)).toEqual([
            undefined,
            'Leads',
            'Clients',
            'Outils',
        ]);
        expect(groups[2].links).toEqual([
            'Dossiers',
            'Visites',
            'Listes de pièces',
        ]);
        // « Annuaire » ouvre le groupe Outils, en bouton de menu fermé.
        expect(
            screen
                .getByRole('button', { name: 'Annuaire' })
                .closest('[data-sidebar="group"]'),
        ).toBe(document.querySelectorAll('[data-sidebar="group"]')[3]);
        expect(groups[3].links).toEqual([
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
            // Les groupes vidés disparaissent avec leur libellé, et le menu
            // « Annuaire » avec ses sous-liens.
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

        // Un total, en gris sur une pastille blanche : il n'appelle rien.
        expect(badgeOf('Dossiers')).toHaveTextContent('5');
        expect(badgeOf('Dossiers')).toHaveAttribute('data-tone', 'total');
        expect(badgeOf('Dossiers')).toHaveClass(
            'bg-background',
            'rounded-full',
        );
        // Ce qui attend une action : un point rouge, le compte en texte lu seulement.
        expect(badgeOf('Leads locataires')).toHaveTextContent('7 en attente');
        expect(badgeOf('Leads locataires')).toHaveClass('bg-destructive');
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
});
