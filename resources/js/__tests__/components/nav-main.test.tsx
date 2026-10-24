import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutGrid, Users } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const visit = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    router: { visit },
    // Comme le vrai Link d'Inertia avec `prefetch` : il pose **ses** gestionnaires
    // de survol après les props reçues, qui sont donc écrasées.
    Link: ({
        href,
        children,
        prefetch: _prefetch,
        ...props
    }: {
        href: string;
        children: ReactNode;
        prefetch?: boolean;
    }) => (
        <a
            href={href}
            {...props}
            onMouseEnter={() => undefined}
            onMouseLeave={() => undefined}
        >
            {children}
        </a>
    ),
    usePage: () => ({ url: '/people/employees', props: {} }),
}));

const current = vi.hoisted(() => ({ url: '/people/employees' }));

vi.mock('@/hooks/use-current-url', () => ({
    useCurrentUrl: () => ({
        currentUrl: current.url,
        isCurrentUrl: (href: string) => href === current.url,
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
                shortcut: 'G A',
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
                    { title: 'Employés', href: '/people/employees', badge: 7 },
                    { title: 'Anciens', href: '/people/former', badge: 0 },
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

beforeEach(() => {
    localStorage.clear();
    current.url = '/people/employees';
});

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

    it('renders a counter on a sub item, hidden when it is zero', () => {
        renderNav();

        const badge = screen.getByText('7');
        expect(badge).toHaveAttribute('data-sidebar', 'menu-badge');
        // Dans le lien lui-même, à droite du libellé : jamais en absolu sous la ligne.
        expect(screen.getByRole('link', { name: /Employés/ })).toContainElement(
            badge,
        );
        expect(screen.queryByText('0')).not.toBeInTheDocument();
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

describe('NavMain section selection', () => {
    it('keeps the most specific sub-link selected on a sub-page of its section', () => {
        vi.doMock('@/hooks/use-current-url', () => ({
            useCurrentUrl: () => ({
                currentUrl: '/people/employees/42/edit',
                isCurrentUrl: () => false,
            }),
        }));

        renderNav();

        expect(screen.getByRole('link', { name: 'Employés' })).toHaveAttribute(
            'data-active',
            'true',
        );
        expect(
            screen.getByRole('link', { name: "Vue d'ensemble" }),
        ).toHaveAttribute('data-active', 'false');
        expect(
            screen.getByRole('button', { name: /Personnes/ }),
        ).toHaveAttribute('data-active', 'true');
    });
});

describe('NavMain single active link', () => {
    const tools: NavGroup[] = [
        {
            label: 'Outils',
            items: [
                {
                    title: 'Outils',
                    href: '/tools',
                    icon: LayoutGrid,
                    items: [{ title: 'Documents', href: '/tools/documents' }],
                },
                { title: 'Rapports', href: '/tools/reports', icon: Users },
            ],
        },
    ];
    const renderTools = () =>
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <NavMain groups={tools} />
                </SidebarProvider>
            </TooltipProvider>,
        );

    it('selects only « Rapports » on /tools/reports, not the « Outils » parent', () => {
        current.url = '/tools/reports';
        renderTools();

        expect(screen.getByRole('link', { name: 'Rapports' })).toHaveAttribute(
            'data-active',
            'true',
        );
        expect(screen.getByRole('link', { name: 'Outils' })).toHaveAttribute(
            'data-active',
            'false',
        );
    });

    it('selects only « Outils » on /tools', () => {
        current.url = '/tools';
        renderTools();

        expect(screen.getByRole('link', { name: 'Outils' })).toHaveAttribute(
            'data-active',
            'true',
        );
        expect(screen.getByRole('link', { name: 'Rapports' })).toHaveAttribute(
            'data-active',
            'false',
        );
    });
});

describe('NavMain branch animation', () => {
    it('staggers the sub-links and rotates the chevron when open', () => {
        renderNav();

        const links = [
            screen.getByRole('link', { name: "Vue d'ensemble" }),
            screen.getByRole('link', { name: 'Employés' }),
        ].map((link) => link.closest('li'));

        expect(links[0]).toHaveStyle({ animationDelay: '40ms' });
        expect(links[1]).toHaveStyle({ animationDelay: '80ms' });
        expect(links[0]).toHaveClass('animate-in', 'fade-in');

        const trigger = screen.getByRole('button', { name: /Personnes/ });
        expect(trigger.querySelector('svg.rotate-180')).not.toBeNull();
    });
});

describe('NavMain closed branches', () => {
    it('keeps a branch closed when none of its links is the current page', () => {
        vi.doMock('@/hooks/use-current-url', () => ({
            useCurrentUrl: () => ({
                currentUrl: '/elsewhere',
                isCurrentUrl: () => false,
            }),
        }));

        render(
            <TooltipProvider>
                <SidebarProvider>
                    <NavMain
                        groups={[
                            {
                                label: 'Gestion',
                                items: [
                                    {
                                        title: 'Équipe',
                                        href: '#',
                                        icon: Users,
                                        items: [
                                            { title: 'Membres', href: '/team' },
                                        ],
                                    },
                                ],
                            },
                        ]}
                    />
                </SidebarProvider>
            </TooltipProvider>,
        );

        expect(screen.getByRole('button', { name: /Équipe/ })).toHaveAttribute(
            'data-state',
            'closed',
        );
        expect(screen.queryByRole('link', { name: 'Membres' })).toBeNull();
    });
});

describe('NavMain remembered branches', () => {
    it('persists a closed branch across refreshes even if it holds the current page', async () => {
        const user = userEvent.setup();
        const { unmount } = renderNav();

        await user.click(screen.getByRole('button', { name: /Personnes/ }));

        expect(localStorage.getItem('sidebar.branch.Personnes')).toBe('0');
        unmount();

        renderNav();

        expect(
            screen.getByRole('button', { name: /Personnes/ }),
        ).toHaveAttribute('data-state', 'closed');
    });

    it('reopens a branch the user had opened', async () => {
        vi.doMock('@/hooks/use-current-url', () => ({
            useCurrentUrl: () => ({
                currentUrl: '/elsewhere',
                isCurrentUrl: () => false,
            }),
        }));
        localStorage.setItem('sidebar.branch.Personnes', '1');

        renderNav();

        expect(
            screen.getByRole('button', { name: /Personnes/ }),
        ).toHaveAttribute('data-state', 'open');
        expect(screen.getByRole('link', { name: 'Employés' })).toBeVisible();
    });
});

describe('NavMain collapsible groups', () => {
    it('folds a group from its label, hides its links and remembers it across refreshes, even with the current page inside', async () => {
        const user = userEvent.setup();
        const { unmount } = renderNav();

        const label = screen.getByRole('button', { name: 'Replier Gestion' });
        expect(label).toHaveAttribute('aria-expanded', 'true');
        // Les liens arrivent en cascade à l'ouverture, un décalage par ligne.
        expect(
            screen.getByRole('link', { name: 'Tableau de bord' }).closest('li'),
        ).toHaveStyle({ animationDelay: '40ms' });

        await user.click(label);

        expect(localStorage.getItem('sidebar.group.Gestion')).toBe('0');
        expect(
            screen.getByRole('button', { name: 'Déplier Gestion' }),
        ).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('link', { name: 'Employés' })).toBeNull();
        // L'autre groupe n'a pas bougé.
        expect(
            screen.getByRole('link', { name: 'Tableau de bord' }),
        ).toBeVisible();
        unmount();

        // Au rechargement, le groupe reste plié : il ne se rouvre pas parce
        // que la page courante (/people/employees) est dedans.
        renderNav();
        expect(
            screen.getByRole('button', { name: 'Déplier Gestion' }),
        ).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('link', { name: 'Employés' })).toBeNull();
    });

    it('does not fold a group without a label', () => {
        render(
            <TooltipProvider>
                <SidebarProvider>
                    <NavMain
                        groups={[
                            {
                                label: '',
                                items: [
                                    { title: 'Accueil', href: '/dashboard' },
                                ],
                            },
                        ]}
                    />
                </SidebarProvider>
            </TooltipProvider>,
        );

        expect(screen.queryByRole('button', { name: /Replier/ })).toBeNull();
        expect(screen.getByRole('link', { name: 'Accueil' })).toBeVisible();
    });
});

describe('NavMain folded group markers', () => {
    it('sums the pending badges on a folded group and marks the one holding the current page', async () => {
        const user = userEvent.setup();
        renderNav();

        // Ouvert : pas de pastille sur l'intitulé, le compteur est sur la ligne.
        expect(screen.queryByLabelText('3 en attente')).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Replier Général' }),
        );
        expect(screen.getByLabelText('3 en attente')).toHaveTextContent('3');

        // « Général » plié ne contient pas la page courante : pas de filet.
        expect(
            screen.getByRole('button', { name: 'Déplier Général' }),
        ).not.toHaveAttribute('data-active');
        // « Gestion » contient la page courante (/people/employees) : plié, il garde un filet.
        await user.click(
            screen.getByRole('button', { name: 'Replier Gestion' }),
        );
        expect(
            screen.getByRole('button', { name: 'Déplier Gestion' }),
        ).toHaveAttribute('data-active', 'true');
    });
});

describe('NavMain keyboard shortcuts', () => {
    beforeEach(() => visit.mockClear());

    it('navigates with « G » then the letter, never from a field', () => {
        renderNav();

        fireEvent.keyDown(window, { key: 'g' });
        fireEvent.keyDown(window, { key: 'a' });
        expect(visit).toHaveBeenCalledWith('/dashboard');

        // Sans « G » d'abord, la lettre ne fait rien.
        visit.mockClear();
        fireEvent.keyDown(window, { key: 'a' });
        expect(visit).not.toHaveBeenCalled();

        // Dans un champ, les lettres restent au champ.
        const input = document.createElement('input');
        document.body.appendChild(input);
        act(() => {
            fireEvent.keyDown(input, { key: 'g' });
            fireEvent.keyDown(input, { key: 'a' });
        });
        expect(visit).not.toHaveBeenCalled();
        input.remove();

        // Avec ⌘, c'est un autre raccourci.
        fireEvent.keyDown(window, { key: 'g', metaKey: true });
        fireEvent.keyDown(window, { key: 'a' });
        expect(visit).not.toHaveBeenCalled();
    });
});

// Poignée d'une icône animée, au niveau du module : le compilateur React
// sort les fonctions des composants, une fermeture locale ne le survit pas.
const iconSpies = { startAnimation: vi.fn(), stopAnimation: vi.fn() };
const AnimatedIcon = forwardRef<
    { startAnimation: () => void; stopAnimation: () => void },
    { size?: number; animateOnHover?: boolean; className?: string }
>(function AnimatedIcon(_props, ref) {
    useImperativeHandle(ref, () => iconSpies);

    return <svg data-testid="animated-icon" />;
});

describe('NavMain animated icons', () => {
    it('plays the icon when the row is hovered, even though the Inertia Link owns its own hover handlers', () => {
        const groups: NavGroup[] = [
            {
                label: 'Clients',
                items: [
                    {
                        title: 'Dossiers',
                        href: '/clients',
                        icon: Users,
                        animatedIcon: AnimatedIcon as never,
                    },
                ],
            },
        ];

        render(
            <TooltipProvider>
                <SidebarProvider>
                    <NavMain groups={groups} />
                </SidebarProvider>
            </TooltipProvider>,
        );

        const link = screen.getByRole('link', { name: 'Dossiers' });
        fireEvent.mouseEnter(link);
        expect(iconSpies.startAnimation).toHaveBeenCalledTimes(1);

        fireEvent.mouseLeave(link.closest('li')!);
        expect(iconSpies.stopAnimation).toHaveBeenCalledTimes(1);
    });
});
