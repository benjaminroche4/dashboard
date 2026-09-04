import {
    Bell,
    Calendar,
    ChartPie,
    ClipboardCheck,
    ClipboardList,
    Contact,
    LayoutGrid,
} from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as invoicesIndex } from '@/routes/invoices';
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
                title: 'Leads',
                href: '#',
                icon: Contact,
                items: [{ title: 'Factures', href: invoicesIndex() }],
            },
            { title: 'Rapports', href: '#', icon: ChartPie },
            { title: 'Calendrier', href: '#', icon: Calendar },
            { title: 'Tâches', href: '#', icon: ClipboardCheck },
        ],
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <WorkspaceSwitcher />
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
