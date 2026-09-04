import { Link } from '@inertiajs/react';
import {
    Bell,
    Calendar,
    ChartPie,
    ChevronsUpDown,
    ClipboardCheck,
    ClipboardList,
    LayoutGrid,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavGroup } from '@/types';

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
            { title: 'Notifications', href: '#', icon: Bell, badge: 8 },
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

// Le bouton replier/déplier vit dans l'en-tête de page (SidebarTrigger), pas ici.
function SidebarBrand() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                    <Link href={dashboard()} prefetch>
                        <AppLogo />
                        <ChevronsUpDown className="text-muted-foreground size-4" />
                    </Link>
                </SidebarMenuButton>
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
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
