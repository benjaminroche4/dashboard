import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/breadcrumbs', () => ({
    Breadcrumbs: () => <nav aria-label="fil d'ariane" />,
}));
vi.mock('@/components/online-staff', () => ({ OnlineStaff: () => null }));
vi.mock('@/components/realtime-staff', () => ({ RealtimeStaff: () => null }));
vi.mock('@/components/ui/sidebar', () => ({
    SidebarTrigger: (props: React.ComponentProps<'button'>) => (
        <button type="button" {...props}>
            toggle
        </button>
    ),
}));
vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    // La palette ⌘K lit les droits du membre pour filtrer ses pages.
    usePage: () => ({
        props: { auth: { can: { manageStaff: false }, access: null } },
    }),
    // La cloche d'activité est un lien vers le journal.
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: React.ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import { AppSidebarHeader } from '@/components/app-sidebar-header';

describe('AppSidebarHeader', () => {
    it('lays out navigation, search and presence in three zones', () => {
        const { container } = render(<AppSidebarHeader />);
        const header = container.querySelector('header');

        expect(header).toHaveClass('grid-cols-[1fr_auto_1fr]');
        expect(screen.getByLabelText("fil d'ariane")).toBeInTheDocument();
        // Le bouton du menu parle français et affiche ses raccourcis.
        const trigger = screen.getByRole('button', {
            name: 'Afficher ou masquer le menu',
        });
        expect(trigger).toHaveAttribute(
            'title',
            'Afficher ou masquer le menu · ⌘C ou G M',
        );
        expect(
            screen.getByRole('button', { name: 'Rechercher' }),
        ).toBeInTheDocument();
    });
});
