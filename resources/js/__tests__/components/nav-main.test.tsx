import { render, screen } from '@testing-library/react';
import { LayoutGrid, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children: ReactNode;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    usePage: () => ({ url: '/people/employees', props: {} }),
}));

vi.mock('@/hooks/use-current-url', () => ({
    useCurrentUrl: () => ({
        isCurrentUrl: (href: string) => href === '/people/employees',
    }),
}));

import { NavMain } from '@/components/nav-main';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { NavGroup } from '@/types';

const groups: NavGroup[] = [
    {
        label: 'Général',
        items: [
            {
                title: 'Tableau de bord',
                href: '/dashboard',
                icon: LayoutGrid,
                badge: 3,
            },
        ],
    },
    {
        label: 'Gestion',
        items: [
            {
                title: 'Personnes',
                href: '#',
                icon: Users,
                items: [
                    { title: "Vue d'ensemble", href: '/people' },
                    { title: 'Employés', href: '/people/employees' },
                ],
            },
        ],
    },
];

function renderNav() {
    return render(
        <TooltipProvider>
            <SidebarProvider>
                <NavMain groups={groups} />
            </SidebarProvider>
        </TooltipProvider>,
    );
}

describe('NavMain', () => {
    it('renders one group per section with its label', () => {
        renderNav();

        expect(screen.getByText('Général')).toBeInTheDocument();
        expect(screen.getByText('Gestion')).toBeInTheDocument();
    });

    it('renders a leaf item with its badge', () => {
        renderNav();

        expect(
            screen.getByRole('link', { name: /Tableau de bord/ }),
        ).toHaveAttribute('href', '/dashboard');
        expect(screen.getByText('3')).toHaveAttribute(
            'data-sidebar',
            'menu-badge',
        );
    });

    it('opens the branch that contains the current page and marks it active', () => {
        renderNav();

        const employees = screen.getByRole('link', { name: 'Employés' });

        expect(employees).toHaveAttribute('data-active', 'true');
        expect(
            screen.getByRole('button', { name: /Personnes/ }),
        ).toHaveAttribute('data-active', 'true');
        expect(
            screen.getByRole('link', { name: "Vue d'ensemble" }),
        ).toHaveAttribute('data-active', 'false');
    });
});

describe('NavMain branch animation', () => {
    it('staggers the sub-links and rotates the chevron when open', () => {
        renderNav();

        const links = [
            screen.getByRole('link', { name: "Vue d'ensemble" }),
            screen.getByRole('link', { name: 'Employés' }),
        ].map((link) => link.closest('li'));

        expect(links[0]).toHaveStyle({ animationDelay: '60ms' });
        expect(links[1]).toHaveStyle({ animationDelay: '120ms' });
        expect(links[0]).toHaveClass('animate-in', 'fade-in');

        const trigger = screen.getByRole('button', { name: /Personnes/ });
        expect(trigger.querySelector('svg.rotate-180')).not.toBeNull();
    });
});
