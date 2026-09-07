import {
    Building2,
    ChartPie,
    Contact,
    Handshake,
    KeyRound,
    Users,
    Wrench,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
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
import { index as agenciesIndex } from '@/routes/agencies';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';
import { index as agentsIndex } from '@/routes/agents';
import { index as invoicesIndex } from '@/routes/invoices';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import { index as ownersIndex, leads as ownersLeads } from '@/routes/owners';
import { index as partnersIndex } from '@/routes/partners';
import { index as toolsIndex } from '@/routes/tools';
import { index as documentsIndex } from '@/routes/tools/documents';
import { index as quotesIndex } from '@/routes/tools/quotes';
import { index as reportsIndex } from '@/routes/tools/reports';
import type { NavGroup } from '@/types';

/** Groupes du menu ; `leadsTodo` = leads « À traiter », affiché sur « Liste des leads ». */
function buildNavGroups(leadsTodo: number): NavGroup[] {
    return [
        {
            label: 'Gestion',
            items: [
                {
                    title: 'Leads',
                    href: leadsIndex(),
                    icon: Contact,
                    items: [
                        {
                            title: 'Liste des leads',
                            href: leadsIndex(),
                            badge: leadsTodo,
                        },
                        { title: 'Converting Machine', href: leadsCreate() },
                    ],
                },
                {
                    title: 'Clients',
                    href: clientsIndex(),
                    icon: Users,
                    items: [
                        { title: 'Dossiers', href: clientsIndex() },
                        { title: 'Documents', href: documentsIndex() },
                        { title: 'Visites', href: clientsVisits() },
                    ],
                },
                {
                    title: 'Agents immobiliers',
                    href: agentsIndex(),
                    icon: Building2,
                    items: [
                        { title: 'Agents', href: agentsIndex() },
                        { title: 'Agences', href: agenciesIndex() },
                    ],
                },
                {
                    title: 'Propriétaires',
                    href: ownersLeads(),
                    icon: KeyRound,
                    items: [
                        { title: 'Liste des leads', href: ownersLeads() },
                        {
                            title: 'Liste des biens et propriétaires',
                            href: ownersIndex(),
                        },
                    ],
                },
                {
                    title: 'Partenaires',
                    href: partnersIndex(),
                    icon: Handshake,
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
                    items: [
                        {
                            title: 'Devis',
                            href: quotesIndex(),
                        },
                        {
                            title: 'Factures',
                            href: invoicesIndex(),
                        },
                        {
                            title: 'Documents',
                            href: documentsIndex(),
                        },
                    ],
                },
                {
                    title: 'Rapports',
                    href: reportsIndex(),
                    icon: ChartPie,
                },
            ],
        },
    ];
}

export function AppSidebar() {
    const { counts } = usePage().props;
    const navGroups = buildNavGroups(counts?.leadsTodo ?? 0);

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
