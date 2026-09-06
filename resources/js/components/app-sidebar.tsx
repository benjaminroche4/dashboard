import { Contact, Wrench } from 'lucide-react';
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
import { index as invoicesIndex } from '@/routes/invoices';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import { index as toolsIndex } from '@/routes/tools';
import { index as documentsIndex } from '@/routes/tools/documents';
import type { NavGroup } from '@/types';

const navGroups: NavGroup[] = [
    {
        label: 'Gestion',
        items: [
            {
                title: 'Leads',
                href: leadsIndex(),
                icon: Contact,
                items: [
                    { title: 'Liste des leads', href: leadsIndex() },
                    { title: 'Converting Machine', href: leadsCreate() },
                    { title: 'Factures', href: invoicesIndex() },
                ],
            },
        ],
    },
    {
        label: 'Outils',
        items: [
            {
                title: 'Outils',
                href: toolsIndex(),
                icon: Wrench,
                items: [{ title: 'Documents', href: documentsIndex() }],
            },
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
