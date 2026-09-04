import { Link } from '@inertiajs/react';
import {
    Bell,
    Calendar,
    ChartPie,
    ChevronsUpDown,
    CircleHelp,
    ClipboardCheck,
    ClipboardList,
    LayoutGrid,
    PanelsTopLeft,
    Settings,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { dashboard, home } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import type { NavGroup, NavItem } from '@/types';

// Les pages hors tableau de bord ne sont pas encore créées : liens en attente.
const navGroups: NavGroup[] = [
    {
        label: 'Général',
        items: [
            {
                title: 'Tableau de bord',
                href: dashboard(),
                icon: LayoutGrid,
                badge: 3,
            },
            { title: 'Projets', href: '#', icon: ClipboardList },
            { title: 'Notifications', href: '#', icon: Bell, badge: '+8' },
        ],
    },
    {
        label: 'Gestion',
        items: [
            {
                title: 'Personnes',
                href: '#',
                icon: Users,
                isActive: true,
                items: [
                    { title: "Vue d'ensemble", href: '#' },
                    { title: 'Employés', href: '#' },
                    { title: 'Équipes', href: '#' },
                ],
            },
            { title: 'Rapports', href: '#', icon: ChartPie },
            { title: 'Calendrier', href: '#', icon: Calendar },
            { title: 'Tâches', href: '#', icon: ClipboardCheck },
        ],
    },
];

const footerNavItems: NavItem[] = [
    { title: 'Paramètres', href: editProfile(), icon: Settings },
    { title: 'Aide et guide', href: '#', icon: CircleHelp },
    {
        title: 'Ouvrir dans le navigateur',
        href: home(),
        icon: PanelsTopLeft,
        external: true,
    },
];

function SidebarBrand() {
    const { toggleSidebar } = useSidebar();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                    <Link href={dashboard()} prefetch>
                        <AppLogo />
                        <ChevronsUpDown className="text-muted-foreground size-4" />
                    </Link>
                </SidebarMenuButton>
                <SidebarMenuAction
                    onClick={toggleSidebar}
                    aria-label="Replier ou déplier la barre latérale"
                    className="top-3.5"
                >
                    <PanelsTopLeft />
                </SidebarMenuAction>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarBrand />
            </SidebarHeader>
            <SidebarSeparator className="mx-0 w-auto group-data-[collapsible=icon]:hidden" />

            <SidebarContent>
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
