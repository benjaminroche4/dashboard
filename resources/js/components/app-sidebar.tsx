import {
    Building2,
    CalendarCheck,
    Contact,
    Handshake,
    House,
    KeyRound,
    LayoutGrid,
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
import { dashboard } from '@/routes';
import { index as agenciesIndex } from '@/routes/agencies';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';
import { index as agentsIndex } from '@/routes/agents';
import { index as invoicesIndex } from '@/routes/invoices';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import { index as ownersIndex, leads as ownersLeads } from '@/routes/owners';
import { create as ownerLeadCreate } from '@/routes/owners/leads';
import { index as partnersIndex } from '@/routes/partners';
import { index as propertiesIndex } from '@/routes/properties';
import { index as toolsIndex } from '@/routes/tools';
import { index as activityIndex } from '@/routes/tools/activity';
import { index as documentsIndex } from '@/routes/tools/documents';
import { index as quotesIndex } from '@/routes/tools/quotes';
import { index as reportsIndex } from '@/routes/tools/reports';
import { filterNavGroups } from '@/lib/nav-access';
import type { NavGroup } from '@/types';

/** Groupes du menu ; `leadsTodo` et `ownerLeadsTodo` = leads « À traiter », affichés sur « Leads locataires » et « Leads propriétaires ». */
function buildNavGroups(leadsTodo: number, ownerLeadsTodo: number): NavGroup[] {
    return [
        // Tableau de bord seul en tête, sans libellé de groupe.
        {
            label: '',
            items: [
                {
                    title: 'Tableau de bord',
                    href: dashboard(),
                    icon: LayoutGrid,
                },
            ],
        },
        {
            label: 'Leads',
            items: [
                {
                    title: 'Locataires',
                    href: leadsIndex(),
                    icon: Contact,
                    items: [
                        {
                            title: 'Leads locataires',
                            href: leadsIndex(),
                            badge: leadsTodo,
                            section: 'leads',
                        },
                        {
                            title: 'Nouveau lead locataire',
                            href: leadsCreate(),
                            section: 'leads_create',
                        },
                    ],
                },
                {
                    title: 'Propriétaires',
                    href: ownersLeads(),
                    icon: KeyRound,
                    key: 'Leads propriétaires',
                    items: [
                        {
                            title: 'Leads propriétaires',
                            href: ownersLeads(),
                            badge: ownerLeadsTodo,
                            section: 'owner_leads',
                        },
                        {
                            title: 'Nouveau lead propriétaire',
                            href: ownerLeadCreate(),
                            section: 'owner_leads_create',
                        },
                    ],
                },
            ],
        },
        // Un seul menu par page : pas de niveau intermédiaire qui répète le
        // libellé du groupe (« Clients › Clients › Dossiers clients »).
        {
            label: 'Clients',
            items: [
                {
                    title: 'Dossiers clients',
                    href: clientsIndex(),
                    icon: Users,
                    section: 'clients',
                },
                {
                    title: 'Visites',
                    href: clientsVisits(),
                    icon: CalendarCheck,
                    section: 'visits',
                },
            ],
        },
        {
            label: 'Réseau',
            items: [
                {
                    title: 'Agents et agences',
                    href: agentsIndex(),
                    icon: Building2,
                    items: [
                        {
                            title: 'Agents',
                            href: agentsIndex(),
                            section: 'agents',
                        },
                        {
                            title: 'Agences',
                            href: agenciesIndex(),
                            section: 'agents',
                        },
                    ],
                },
                {
                    title: 'Partenaires',
                    href: partnersIndex(),
                    icon: Handshake,
                    section: 'partners',
                },
                {
                    title: 'Propriétaires et biens',
                    href: ownersIndex(),
                    icon: House,
                    key: 'Réseau propriétaires',
                    items: [
                        {
                            // L'annuaire des propriétaires : qui possède quoi.
                            // La prospection vit dans « Leads › Propriétaires ».
                            title: 'Propriétaires',
                            href: ownersIndex(),
                            section: 'owners',
                        },
                        {
                            title: 'Biens',
                            href: propertiesIndex(),
                            section: 'properties',
                        },
                    ],
                },
            ],
        },
        // Le menu porte déjà le nom « Outils » : le groupe n'a pas de libellé.
        // Rapports et Journal d'activité sont dedans, comme les autres outils.
        {
            label: '',
            items: [
                {
                    title: 'Outils',
                    href: toolsIndex(),
                    icon: Wrench,
                    items: [
                        {
                            title: 'Devis',
                            href: quotesIndex(),
                            section: 'quotes',
                        },
                        {
                            title: 'Factures',
                            href: invoicesIndex(),
                            section: 'invoices',
                        },
                        {
                            title: 'Listes de documents',
                            href: documentsIndex(),
                            section: 'documents',
                        },
                        {
                            title: 'Rapports',
                            href: reportsIndex(),
                            section: 'reports',
                        },
                        {
                            title: "Journal d'activité",
                            href: activityIndex(),
                            section: 'activity',
                        },
                    ],
                },
            ],
        },
    ];
}

export function AppSidebar() {
    const { counts, auth } = usePage().props;
    const navGroups = filterNavGroups(
        buildNavGroups(counts?.leadsTodo ?? 0, counts?.ownerLeadsTodo ?? 0),
        auth?.access ?? null,
    );

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
