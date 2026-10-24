import {
    BriefcaseBusinessIcon,
    CalendarCheckIcon,
    ChartPieIcon,
    FilePenLineIcon,
    FileStackIcon,
    FolderOpenIcon,
    HeartHandshakeIcon,
    HistoryIcon,
    HomeIcon,
    IdCardIcon,
    KeyIcon,
    MapPinHouseIcon,
    ReceiptEuroIcon,
    SunIcon,
    UserCheckIcon,
    UserRoundPlusIcon,
} from 'lucide-animated';
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
import { create as visitsCreate } from '@/routes/clients/visits';
import { index as agentsIndex } from '@/routes/agents';
import { index as invoicesIndex } from '@/routes/invoices';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import { index as ownersIndex, leads as ownersLeads } from '@/routes/owners';
import { index as partnersIndex } from '@/routes/partners';
import { index as companiesIndex } from '@/routes/companies';
import { index as propertiesIndex } from '@/routes/properties';
import { index as activityIndex } from '@/routes/tools/activity';
import {
    create as documentsCreate,
    index as documentsIndex,
} from '@/routes/tools/documents';
import { index as quotesIndex } from '@/routes/tools/quotes';
import { index as reportsIndex } from '@/routes/tools/reports';
import { filterNavGroups } from '@/lib/nav-access';
import type { NavGroup } from '@/types';

/** Groupes du menu ; `leadsTodo` et `ownerLeadsTodo` = leads « À traiter », affichés sur la liste de chaque segment. */
type Counts = {
    leadsTodo: number;
    ownerLeadsTodo: number;
    clients: number;
    pendingUploads: number;
};

/**
 * Groupes du menu. `badge` dit ce qui attend une action (leads à traiter,
 * pièces à vérifier), `total`
 * un simple compte ; `create` pose un « + » vers le formulaire, `shortcut`
 * le raccourci « G puis touche ».
 */
export function buildNavGroups(counts: Counts): NavGroup[] {
    return [
        // « Aujourd'hui » seul en tête, sans libellé de groupe : la page dit
        // ce qu'un membre a à faire maintenant, pas un « tableau de bord ».
        // Chaque entrée porte une icône `lucide-animated` : un léger
        // mouvement au survol de la ligne, c'est le geste demandé par l'équipe.
        {
            label: '',
            items: [
                {
                    title: 'Aujourd’hui',
                    href: dashboard(),
                    animatedIcon: SunIcon,
                    shortcut: 'G A',
                },
            ],
        },
        // Deux liens directs : la page porte déjà son bouton « Nouveau lead »,
        // un sous-menu pour l'y mener n'apprenait rien. Le libellé dit le
        // segment entier : en mode icône comme dans ⌘K, « Propriétaires » seul
        // se confondrait avec l'annuaire.
        {
            label: 'Leads',
            items: [
                {
                    title: 'Leads locataires',
                    href: leadsIndex(),
                    animatedIcon: UserRoundPlusIcon,
                    badge: counts.leadsTodo,
                    section: 'leads',
                    shortcut: 'G L',
                    create: {
                        href: leadsCreate(),
                        label: 'Nouveau lead locataire',
                        section: 'leads_create',
                    },
                },
                {
                    title: 'Leads propriétaires',
                    href: ownersLeads(),
                    animatedIcon: KeyIcon,
                    badge: counts.ownerLeadsTodo,
                    section: 'owner_leads',
                    shortcut: 'G O',
                    create: {
                        href: leadsCreate({ query: { segment: 'owner' } }),
                        label: 'Nouveau lead propriétaire',
                        section: 'owner_leads_create',
                    },
                },
            ],
        },
        // Un seul menu par page : pas de niveau intermédiaire qui répète le
        // libellé du groupe. Les listes de pièces sont une pièce du dossier
        // client : elles vivent ici, pas dans un outil à part.
        {
            label: 'Clients',
            items: [
                {
                    title: 'Dossiers',
                    href: clientsIndex(),
                    animatedIcon: FolderOpenIcon,
                    // Le nombre de dossiers suivis : un total, pas une alerte.
                    total: counts.clients,
                    section: 'clients',
                    shortcut: 'G D',
                },
                {
                    title: 'Visites',
                    href: clientsVisits(),
                    animatedIcon: CalendarCheckIcon,
                    // Pas de compteur : les comptes rendus dus se lisent sur
                    // la page et dans « Aujourd'hui », pas dans le menu.
                    section: 'visits',
                    shortcut: 'G V',
                    create: {
                        href: visitsCreate(),
                        label: 'Planifier une visite',
                        section: 'visits',
                    },
                },
                {
                    // Le même nom que l'objet, partout : une liste de pièces.
                    title: 'Listes de pièces',
                    href: documentsIndex(),
                    animatedIcon: FileStackIcon,
                    badge: counts.pendingUploads,
                    section: 'documents',
                    shortcut: 'G P',
                    create: {
                        href: documentsCreate(),
                        label: 'Nouvelle liste de pièces',
                        section: 'documents',
                    },
                },
            ],
        },
        // « Annuaire » : les fiches des tiers avec qui l'équipe travaille, à
        // plat. Un menu dépliable qui ne cache que deux liens coûtait un clic
        // pour rien.
        {
            label: 'Annuaire',
            items: [
                {
                    title: 'Agents',
                    href: agentsIndex(),
                    animatedIcon: UserCheckIcon,
                    section: 'agents',
                    shortcut: 'G T',
                },
                {
                    title: 'Agences',
                    href: agenciesIndex(),
                    animatedIcon: MapPinHouseIcon,
                    section: 'agents',
                    shortcut: 'G C',
                },
                {
                    title: 'Partenaires',
                    href: partnersIndex(),
                    animatedIcon: HeartHandshakeIcon,
                    section: 'partners',
                    shortcut: 'G R',
                },
                {
                    // Employeurs et sociétés qui nous confient leurs collaborateurs.
                    title: 'Entreprises',
                    href: companiesIndex(),
                    animatedIcon: BriefcaseBusinessIcon,
                    section: 'companies',
                    shortcut: 'G N',
                },
                {
                    // L'annuaire de qui possède quoi ; la prospection, c'est
                    // « Leads propriétaires » plus haut.
                    title: 'Propriétaires',
                    href: ownersIndex(),
                    animatedIcon: IdCardIcon,
                    section: 'owners',
                    shortcut: 'G I',
                },
                {
                    title: 'Biens',
                    href: propertiesIndex(),
                    animatedIcon: HomeIcon,
                    section: 'properties',
                    shortcut: 'G B',
                },
            ],
        },
        // Un seul groupe à plat pour ce qui se facture et ce qui se suit :
        // quatre liens sans compteur n'avaient pas besoin de deux intitulés.
        {
            label: 'Outils',
            items: [
                {
                    title: 'Devis',
                    href: quotesIndex(),
                    animatedIcon: FilePenLineIcon,
                    section: 'quotes',
                    shortcut: 'G E',
                },
                {
                    title: 'Factures',
                    href: invoicesIndex(),
                    animatedIcon: ReceiptEuroIcon,
                    // Pas de compteur non plus : les retards se lisent sur la liste.
                    section: 'invoices',
                    shortcut: 'G F',
                },
                {
                    title: 'Rapports',
                    href: reportsIndex(),
                    animatedIcon: ChartPieIcon,
                    section: 'reports',
                    shortcut: 'G S',
                },
                {
                    title: "Journal d'activité",
                    href: activityIndex(),
                    animatedIcon: HistoryIcon,
                    section: 'activity',
                    shortcut: 'G J',
                },
            ],
        },
    ];
}

export function AppSidebar() {
    const { counts, auth } = usePage().props;
    const navGroups = filterNavGroups(
        buildNavGroups({
            leadsTodo: counts?.leadsTodo ?? 0,
            ownerLeadsTodo: counts?.ownerLeadsTodo ?? 0,
            clients: counts?.clients ?? 0,
            pendingUploads: counts?.pendingUploads ?? 0,
        }),
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
