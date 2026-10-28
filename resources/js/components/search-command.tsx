import { router, usePage } from '@inertiajs/react';
import {
    Briefcase,
    Building2,
    CalendarClock,
    CalendarPlus,
    Contact,
    FileSignature,
    FileText,
    FolderOpen,
    Handshake,
    History,
    Home,
    HousePlus,
    KeyRound,
    LayoutGrid,
    Palette,
    Receipt,
    Search,
    ShieldCheck,
    Sparkles,
    UserCircle,
    UserRound,
    Users,
    UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@/components/ui/command';
import { useStoredState } from '@/hooks/use-stored-state';
import { dashboard, search as unifiedSearch } from '@/routes';
import { index as agenciesIndex } from '@/routes/agencies';
import { index as agentsIndex } from '@/routes/agents';
import { edit as editAppearance } from '@/routes/appearance';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';
import { create as visitCreate } from '@/routes/clients/visits';
import { index as companiesIndex } from '@/routes/companies';
import { index as invoicesIndex } from '@/routes/invoices';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import { index as ownersIndex, leads as ownersLeads } from '@/routes/owners';
import { create as ownerLeadCreate } from '@/routes/owners/leads';
import { index as partnersIndex } from '@/routes/partners';
import { edit as editProfile } from '@/routes/profile';
import {
    create as propertyCreate,
    index as propertiesIndex,
} from '@/routes/properties';
import { edit as editSecurity } from '@/routes/security';
import { index as teamIndex } from '@/routes/team';
import { index as activityIndex } from '@/routes/tools/activity';
import {
    create as documentCreate,
    index as documentsIndex,
} from '@/routes/tools/documents';
import { index as quotesIndex } from '@/routes/tools/quotes';
import type {
    AccessMap,
    SearchGroup,
    SearchHit,
    SearchResponse,
    SiteSection,
} from '@/types';

type Icon = typeof LayoutGrid;

export type Destination = {
    title: string;
    keywords: string;
    url: string;
    icon: Icon;
    shortcut?: string;
    /** Section qui ouvre la page ; absente = page libre (Aujourd'hui, paramètres). */
    section?: SiteSection;
    /** Réservée aux administrateurs (page Équipe). */
    admin?: boolean;
    /** Une création : listée sous « Créer », pas sous « Pages ». */
    create?: boolean;
};

/**
 * Pages et créations accessibles depuis la palette. **Toute page du menu doit
 * y figurer** : `__tests__/components/search-command.test.tsx` compare cette
 * liste aux liens de la sidebar et échoue dès qu'une page manque.
 */
export const destinations: Destination[] = [
    {
        title: 'Aujourd’hui',
        keywords: 'accueil dashboard tableau de bord',
        url: dashboard().url,
        icon: LayoutGrid,
        shortcut: '⌘D',
    },
    {
        title: 'Leads locataires',
        keywords: 'kanban prospects statut suivi',
        url: leadsIndex().url,
        icon: Contact,
        section: 'leads',
    },
    {
        title: 'Leads propriétaires',
        keywords: 'kanban prospection gestion locative',
        url: ownersLeads().url,
        icon: KeyRound,
        section: 'owner_leads',
    },
    {
        title: 'Dossiers clients',
        keywords: 'client dossier converti',
        url: clientsIndex().url,
        icon: Users,
        section: 'clients',
    },
    {
        title: 'Visites',
        keywords: 'visite client bien rendez-vous tournée',
        url: clientsVisits().url,
        icon: CalendarClock,
        section: 'visits',
    },
    {
        title: 'Agents immobiliers',
        keywords: 'agent immobilier négociateur',
        url: agentsIndex().url,
        icon: UserRound,
        section: 'agents',
    },
    {
        title: 'Agences immobilières',
        keywords: 'agence immobilière',
        url: agenciesIndex().url,
        icon: Building2,
        section: 'agents',
    },
    {
        title: 'Partenaires',
        keywords: 'partenaire gestion assurance banque déménagement',
        url: partnersIndex().url,
        icon: Handshake,
        section: 'partners',
    },
    {
        title: 'Entreprises',
        keywords: 'entreprise société employeur rh relocation',
        url: companiesIndex().url,
        icon: Briefcase,
        section: 'companies',
    },
    {
        title: 'Propriétaires',
        keywords: 'propriétaire annuaire bailleur',
        url: ownersIndex().url,
        icon: KeyRound,
        section: 'owners',
    },
    {
        title: 'Biens',
        keywords: 'bien logement appartement annonce',
        url: propertiesIndex().url,
        icon: Home,
        section: 'properties',
    },
    {
        title: 'Devis',
        keywords: 'devis chiffrage offre',
        url: quotesIndex().url,
        icon: FileSignature,
        section: 'quotes',
    },
    {
        title: 'Factures',
        keywords: 'facture facturation paiement',
        url: invoicesIndex().url,
        icon: Receipt,
        section: 'invoices',
    },
    {
        title: 'Listes de pièces',
        keywords: 'documents pièces justificatifs dépôt',
        url: documentsIndex().url,
        icon: FileText,
        section: 'documents',
    },
    {
        title: 'Journal d’activité',
        keywords: 'journal activité historique actions',
        url: activityIndex().url,
        icon: History,
        section: 'activity',
    },
    {
        title: 'Équipe',
        keywords: 'équipe membres droits accès',
        url: teamIndex().url,
        icon: UsersRound,
        admin: true,
    },
    {
        title: 'Mon compte',
        keywords: 'profil paramètres',
        url: editProfile().url,
        icon: UserCircle,
        shortcut: '⌘,',
    },
    {
        title: 'Sécurité',
        keywords: 'mot de passe 2fa passkey',
        url: editSecurity().url,
        icon: ShieldCheck,
    },
    {
        title: 'Apparence',
        keywords: 'thème sombre clair',
        url: editAppearance().url,
        icon: Palette,
    },
    // Créations : ce que le menu ne porte plus, la palette le garde.
    {
        title: 'Nouveau lead locataire',
        keywords: 'lead prospect nouveau formulaire qualification créer',
        url: leadsCreate().url,
        icon: Sparkles,
        section: 'leads_create',
        create: true,
    },
    {
        title: 'Nouveau lead propriétaire',
        keywords: 'lead propriétaire nouveau gestion locative créer',
        url: ownerLeadCreate().url,
        icon: Sparkles,
        section: 'owner_leads_create',
        create: true,
    },
    {
        title: 'Nouveau bien',
        keywords: 'bien logement ajouter annonce créer',
        url: propertyCreate().url,
        icon: HousePlus,
        section: 'properties',
        create: true,
    },
    {
        title: 'Planifier une visite',
        keywords: 'visite planifier rendez-vous créer',
        url: visitCreate().url,
        icon: CalendarPlus,
        section: 'visits',
        create: true,
    },
    {
        title: 'Nouvelle liste de pièces',
        keywords: 'documents pièces liste créer',
        url: documentCreate().url,
        icon: FileText,
        section: 'documents',
        create: true,
    },
];

/** Icône par groupe de résultats. */
const kindIcons: Record<string, Icon> = {
    clients: FolderOpen,
    leads: Contact,
    visits: CalendarClock,
    partners: Handshake,
    companies: Briefcase,
    agents: UserRound,
    agencies: Building2,
    owners: KeyRound,
    properties: Home,
    quotes: FileSignature,
    invoices: Receipt,
};

/** Sans accent ni majuscule, pour le filtre local des pages. */
export function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

/** Pages ouvertes au membre : section au moins consultable, et admin pour l'Équipe. */
export function visibleDestinations(
    access: AccessMap | null | undefined,
    manageStaff: boolean,
): Destination[] {
    return destinations.filter((destination) => {
        if (destination.admin && !manageStaff) {
            return false;
        }

        if (destination.section && access) {
            return access[destination.section] !== 'none';
        }

        return true;
    });
}

/** Filtre local des pages, insensible aux accents : le serveur ne les connaît pas. */
export function matchDestinations(
    list: Destination[],
    query: string,
): Destination[] {
    const needle = normalize(query.trim());

    if (needle === '') {
        return list;
    }

    return list.filter((destination) =>
        normalize(`${destination.title} ${destination.keywords}`).includes(
            needle,
        ),
    );
}

/** Fiches ouvertes depuis la palette, les plus récentes d'abord. */
export const RECENT_LIMIT = 6;

export function rememberRecent(
    recent: SearchHit[],
    hit: SearchHit,
): SearchHit[] {
    return [hit, ...recent.filter((item) => item.url !== hit.url)].slice(
        0,
        RECENT_LIMIT,
    );
}

type Feed =
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'ready'; data: SearchResponse };

async function fetchSearch(
    needle: string,
    signal: AbortSignal,
): Promise<SearchResponse> {
    const empty: SearchResponse = { groups: [], mine: [] };

    try {
        const response = await fetch(
            unifiedSearch({ query: { q: needle } }).url,
            {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
                signal,
            },
        );

        if (!response.ok) {
            return empty;
        }

        const data = (await response.json()) as Partial<SearchResponse>;

        return {
            groups: Array.isArray(data.groups) ? data.groups : [],
            mine: Array.isArray(data.mine) ? data.mine : [],
        };
    } catch {
        return empty;
    }
}

function HitRow({
    hit,
    onSelect,
}: {
    hit: SearchHit;
    onSelect: (hit: SearchHit) => void;
}) {
    const Icon = kindIcons[hit.kind] ?? Search;

    return (
        <CommandItem
            value={`${hit.kind}-${hit.uuid}`}
            onSelect={() => onSelect(hit)}
        >
            <Icon />
            <span className="truncate">
                <span>{hit.title}</span>
                {hit.subtitle && (
                    <span className="text-muted-foreground">
                        {' '}
                        · {hit.subtitle}
                    </span>
                )}
            </span>
            {hit.meta && (
                <span className="text-muted-foreground ml-auto shrink-0 truncate text-xs">
                    {hit.meta}
                </span>
            )}
        </CommandItem>
    );
}

/**
 * Champ de recherche de l'en-tête : un clic (ou ⌘K / Ctrl+K) ouvre une
 * palette de commandes. Une seule requête interroge tous les annuaires
 * ouverts au membre (`search`) ; les pages et les créations se filtrent ici.
 */
export function SearchCommand() {
    const [open, setOpen] = useState(false);
    const { auth } = usePage().props;
    const pages = visibleDestinations(
        auth?.access ?? null,
        auth?.can?.manageStaff ?? false,
    );

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key.toLowerCase() === 'k' &&
                (event.metaKey || event.ctrlKey)
            ) {
                event.preventDefault();
                setOpen((current) => !current);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const [query, setQuery] = useState('');
    const [feed, setFeed] = useState<Feed>({ state: 'idle' });
    const [recent, setRecent] = useStoredState<SearchHit[]>(
        'search.recent',
        [],
    );

    // Une requête, avec un léger délai pour ne pas spammer ; à vide, le
    // serveur renvoie « mes dossiers ».
    useEffect(() => {
        if (!open) {
            return;
        }

        const needle = query.trim();
        const controller = new AbortController();
        setFeed({ state: 'loading' });
        const timer = setTimeout(
            () => {
                void fetchSearch(needle, controller.signal).then((data) => {
                    if (!controller.signal.aborted) {
                        setFeed({ state: 'ready', data });
                    }
                });
            },
            needle === '' ? 0 : 200,
        );

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, open]);

    const go = useCallback((url: string) => {
        setOpen(false);
        router.visit(url);
    }, []);

    const openHit = useCallback(
        (hit: SearchHit) => {
            setRecent((current) => rememberRecent(current, hit));
            go(hit.url);
        },
        [go, setRecent],
    );

    const needle = query.trim();
    const searching = needle.length >= 2;
    const groups: SearchGroup[] =
        feed.state === 'ready' && searching ? feed.data.groups : [];
    const mine: SearchHit[] =
        feed.state === 'ready' && !searching ? feed.data.mine : [];
    const matchedPages = matchDestinations(
        pages.filter((page) => !page.create),
        query,
    );
    const matchedCreates = matchDestinations(
        pages.filter((page) => page.create),
        query,
    );
    const loading = searching && feed.state !== 'ready';
    const nothing =
        !loading &&
        groups.length === 0 &&
        matchedPages.length === 0 &&
        matchedCreates.length === 0;
    const canCreateLead = pages.some((page) => page.section === 'leads_create');

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Rechercher"
                data-test="search-trigger"
                className="border-input bg-background text-muted-foreground hover:bg-accent/50 focus-visible:ring-ring/50 flex h-9 w-full max-w-md items-center gap-2 rounded-md border px-3 text-sm shadow-xs transition-colors outline-none focus-visible:ring-[3px]"
            >
                <Search className="size-4 shrink-0" />
                <span className="flex-1 truncate text-left">Rechercher…</span>
                <kbd className="bg-muted text-muted-foreground pointer-events-none hidden h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:inline-flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            <CommandDialog
                open={open}
                onOpenChange={setOpen}
                title="Recherche"
                description="Naviguer dans le backoffice"
                // Les résultats viennent déjà filtrés du serveur ; cmdk ne les
                // refiltre pas (« lea » doit garder « Léa »), les pages le sont ici.
                shouldFilter={false}
            >
                <CommandInput
                    placeholder="Rechercher un nom, une référence, un téléphone, une adresse…"
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    {loading && (
                        <p
                            role="status"
                            className="text-muted-foreground px-4 py-6 text-center text-sm"
                        >
                            Recherche…
                        </p>
                    )}
                    {nothing && <CommandEmpty>Aucun résultat.</CommandEmpty>}
                    {searching && !loading && canCreateLead && (
                        <CommandGroup heading="Créer">
                            <CommandItem
                                value="create-lead"
                                onSelect={() =>
                                    go(
                                        leadsCreate({ query: { name: needle } })
                                            .url,
                                    )
                                }
                            >
                                <Sparkles />
                                <span className="truncate">
                                    Créer le lead « {needle} »
                                </span>
                            </CommandItem>
                        </CommandGroup>
                    )}
                    {!searching && recent.length > 0 && (
                        <CommandGroup heading="Récents">
                            {recent.map((hit) => (
                                <HitRow
                                    key={`recent-${hit.url}`}
                                    hit={hit}
                                    onSelect={openHit}
                                />
                            ))}
                        </CommandGroup>
                    )}
                    {mine.length > 0 && (
                        <CommandGroup heading="Mes dossiers">
                            {mine.map((hit) => (
                                <HitRow
                                    key={`mine-${hit.uuid}`}
                                    hit={hit}
                                    onSelect={openHit}
                                />
                            ))}
                        </CommandGroup>
                    )}
                    {groups.map((group) => (
                        <CommandGroup key={group.kind} heading={group.heading}>
                            {group.hits.map((hit) => (
                                <HitRow
                                    key={hit.uuid}
                                    hit={hit}
                                    onSelect={openHit}
                                />
                            ))}
                        </CommandGroup>
                    ))}
                    {matchedCreates.length > 0 && (
                        <CommandGroup
                            heading={searching ? 'Créer aussi' : 'Créer'}
                        >
                            {matchedCreates.map((destination) => (
                                <CommandItem
                                    key={destination.url}
                                    value={destination.url}
                                    onSelect={() => go(destination.url)}
                                >
                                    <destination.icon />
                                    <span>{destination.title}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    {matchedPages.length > 0 && (
                        <CommandGroup heading="Pages">
                            {matchedPages.map((destination) => (
                                <CommandItem
                                    key={destination.url}
                                    value={destination.url}
                                    onSelect={() => go(destination.url)}
                                >
                                    <destination.icon />
                                    <span>{destination.title}</span>
                                    {destination.shortcut && (
                                        <CommandShortcut>
                                            {destination.shortcut}
                                        </CommandShortcut>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
