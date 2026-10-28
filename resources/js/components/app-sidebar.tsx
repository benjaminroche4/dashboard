import {
    CalendarCheckIcon,
    FilePenLineIcon,
    FileStackIcon,
    FolderOpenIcon,
    KeyIcon,
    ReceiptEuroIcon,
    SunIcon,
    UserRoundPlusIcon,
    UsersRoundIcon,
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
import { index as agentsIndex } from '@/routes/agents';
import { index as invoicesIndex } from '@/routes/invoices';
import { index as leadsIndex } from '@/routes/leads';
import { index as ownersIndex, leads as ownersLeads } from '@/routes/owners';
import { index as partnersIndex } from '@/routes/partners';
import { index as companiesIndex } from '@/routes/companies';
import { index as propertiesIndex } from '@/routes/properties';
import { index as documentsIndex } from '@/routes/tools/documents';
import { index as quotesIndex } from '@/routes/tools/quotes';
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
 * pièces à vérifier : un point rouge), `total` un simple compte, `shortcut`
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
                },
                {
                    title: 'Leads propriétaires',
                    href: ownersLeads(),
                    animatedIcon: KeyIcon,
                    badge: counts.ownerLeadsTodo,
                    section: 'owner_leads',
                    shortcut: 'G O',
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
                },
                {
                    // Le même nom que l'objet, partout : une liste de pièces.
                    title: 'Listes de pièces',
                    href: documentsIndex(),
                    animatedIcon: FileStackIcon,
                    badge: counts.pendingUploads,
                    section: 'documents',
                    shortcut: 'G P',
                },
            ],
        },
        // Un seul groupe à plat pour ce qui se facture et ce qui se suit :
        // quatre liens sans compteur n'avaient pas besoin de deux intitulés.
        {
            label: 'Outils',
            items: [
                // « Annuaire » : les fiches des tiers avec qui l'équipe travaille.
                // Six liens à plat prenaient le tiers du menu : ils vivent dans un
                // seul menu déroulant, en tête des outils, ouvert au clic, qui
                // déploie les liens en arbre (une ligne arrondie vers chacun). Le
                // menu n'est pas une page : cliquer dessus l'ouvre, rien d'autre.
                {
                    title: 'Annuaire',
                    href: '#',
                    animatedIcon: UsersRoundIcon,
                    items: [
                        {
                            title: 'Agents',
                            href: agentsIndex(),
                            section: 'agents',
                            shortcut: 'G T',
                        },
                        {
                            title: 'Agences',
                            href: agenciesIndex(),
                            section: 'agents',
                            shortcut: 'G C',
                        },
                        {
                            title: 'Partenaires',
                            href: partnersIndex(),
                            section: 'partners',
                            shortcut: 'G R',
                        },
                        {
                            // Employeurs et sociétés qui nous confient leurs collaborateurs.
                            title: 'Entreprises',
                            href: companiesIndex(),
                            section: 'companies',
                            shortcut: 'G N',
                        },
                        {
                            // L'annuaire de qui possède quoi ; la prospection, c'est
                            // « Leads propriétaires » plus haut.
                            title: 'Propriétaires',
                            href: ownersIndex(),
                            section: 'owners',
                            shortcut: 'G I',
                        },
                        {
                            title: 'Biens',
                            href: propertiesIndex(),
                            section: 'properties',
                            shortcut: 'G B',
                        },
                    ],
                },
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
                // « Rapports » a quitté le menu le 28 octobre 2026 (la page reste
                // servie), et le journal d'activité vit dans le menu de l'utilisateur.
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
