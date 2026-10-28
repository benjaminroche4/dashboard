import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    DropdownMenu,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { makeUser } from '@/test/fixtures/user';

let access: Record<string, string> | null = null;

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        prefetch: _prefetch,
        as: _as,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
        prefetch?: boolean;
        as?: string;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
    usePage: () => ({
        url: '/dashboard',
        props: { auth: { user: makeUser(), access } },
    }),
    router: { flushAll: vi.fn() },
}));
vi.mock('@/hooks/use-mobile-navigation', () => ({
    useMobileNavigation: () => vi.fn(),
}));

function renderMenu() {
    return render(
        <DropdownMenu open>
            <DropdownMenuContent>
                <UserMenuContent user={makeUser()} />
            </DropdownMenuContent>
        </DropdownMenu>,
    );
}

afterEach(() => {
    access = null;
});

describe('UserMenuContent', () => {
    it("leads to the activity log from the user's menu", () => {
        renderMenu();

        expect(
            screen.getByRole('menuitem', { name: "Journal d'activité" }),
        ).toHaveAttribute('href', '/tools/activity');
        expect(
            screen.getByRole('menuitem', { name: 'Compte' }),
        ).toHaveAttribute('href', '/settings/profile');
    });

    it('hides the activity log from a member without access to the section', () => {
        access = { activity: 'none', leads: 'write' };
        renderMenu();

        expect(
            screen.queryByRole('menuitem', { name: "Journal d'activité" }),
        ).toBeNull();
        expect(
            screen.getByRole('menuitem', { name: 'Se déconnecter' }),
        ).toBeInTheDocument();
    });
});
