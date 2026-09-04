import { render, screen } from '@testing-library/react';
import { CircleHelp, PanelsTopLeft, Settings } from 'lucide-react';
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
    usePage: () => ({ url: '/settings/profile', props: {} }),
}));

vi.mock('@/hooks/use-current-url', () => ({
    useCurrentUrl: () => ({
        isCurrentUrl: (href: string) => href === '/settings/profile',
    }),
}));

import { NavFooter } from '@/components/nav-footer';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('NavFooter', () => {
    it('renders nothing without items', () => {
        const { container } = render(
            <TooltipProvider>
                <SidebarProvider>
                    <NavFooter items={[]} />
                </SidebarProvider>
            </TooltipProvider>,
        );

        expect(container.querySelector('[data-sidebar="group"]')).toBeNull();
    });

    it('renders internal links and external links in a new tab', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <NavFooter
                        items={[
                            {
                                title: 'Paramètres',
                                href: '/settings/profile',
                                icon: Settings,
                            },
                            {
                                title: 'Aide et guide',
                                href: '#',
                                icon: CircleHelp,
                            },
                            {
                                title: 'Ouvrir dans le navigateur',
                                href: '/',
                                icon: PanelsTopLeft,
                                external: true,
                            },
                        ]}
                    />
                </SidebarProvider>
            </TooltipProvider>,
        );

        expect(
            screen.getByRole('link', { name: 'Paramètres' }),
        ).toHaveAttribute('data-active', 'true');

        const external = screen.getByRole('link', {
            name: 'Ouvrir dans le navigateur',
        });
        expect(external).toHaveAttribute('target', '_blank');
        expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
