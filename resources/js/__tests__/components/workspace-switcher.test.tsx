import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { visit } = vi.hoisted(() => ({ visit: vi.fn() }));

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
    usePage: () => ({ url: '/dashboard', props: { name: 'Dashboard' } }),
    router: { visit },
}));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';

function renderSwitcher() {
    const utils = render(
        <TooltipProvider>
            <SidebarProvider>
                <WorkspaceSwitcher />
            </SidebarProvider>
        </TooltipProvider>,
    );
    const trigger = utils.container.querySelector<HTMLElement>(
        '[data-test="workspace-switcher"]',
    );

    if (!trigger) {
        throw new Error('Trigger introuvable');
    }

    return { ...utils, trigger };
}

describe('WorkspaceSwitcher', () => {
    it('shows the workspace name in the trigger', () => {
        const { trigger } = renderSwitcher();

        expect(trigger).toHaveTextContent('Dashboard');
    });

    it('opens a menu with the current workspace and the shortcuts', async () => {
        const user = userEvent.setup();
        const { trigger } = renderSwitcher();

        await user.click(trigger);

        expect(
            await screen.findByText('Espace de travail'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: /Tableau de bord/ }),
        ).toHaveAttribute('href', '/dashboard');
        expect(
            screen.getByRole('menuitem', { name: /Paramètres/ }),
        ).toHaveAttribute('href', '/settings/profile');
        expect(
            screen.getByRole('menuitem', { name: /Ajouter un espace/ }),
        ).toHaveAttribute('aria-disabled', 'true');
    });

    it('navigates with the keyboard shortcuts', async () => {
        const user = userEvent.setup();
        renderSwitcher();

        await user.keyboard('{Meta>}d{/Meta}');
        expect(visit).toHaveBeenLastCalledWith('/dashboard');

        await user.keyboard('{Control>},{/Control}');
        expect(visit).toHaveBeenLastCalledWith('/settings/profile');
    });
});
