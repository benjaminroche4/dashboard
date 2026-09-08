import { router } from '@inertiajs/react';
import {
    Contact,
    FileSignature,
    FileText,
    Home,
    KeyRound,
    LayoutGrid,
    Palette,
    Search,
    ShieldCheck,
    Sparkles,
    UserCircle,
    Building2,
    CalendarClock,
    Handshake,
    House,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { search as leadsSearch } from '@/routes/leads';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@/components/ui/command';
import { dashboard } from '@/routes';
import { edit as editAppearance } from '@/routes/appearance';
import { index as agenciesIndex } from '@/routes/agencies';
import { index as agentsIndex } from '@/routes/agents';
import {
    index as invoicesIndex,
    search as invoicesSearch,
} from '@/routes/invoices';
import { search as quotesSearch } from '@/routes/tools/quotes';
import { search as ownersSearch } from '@/routes/owners';
import {
    index as partnersIndex,
    search as partnersSearch,
} from '@/routes/partners';
import {
    index as propertiesIndex,
    search as propertiesSearch,
} from '@/routes/properties';
import { visits as clientsVisits } from '@/routes/clients';
import { formatMoney } from '@/lib/format';
import { partnerTypeIcons } from '@/lib/partner-type-icons';
import type { PartnerType } from '@/types';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

type LeadHit = {
    id: number;
    reference: string | null;
    name: string;
    email: string | null;
    company: string | null;
    status_label: string;
    url: string;
};

type PartnerHit = {
    id: number;
    uuid: string;
    name: string;
    type: PartnerType;
    type_label: string;
    contact: string | null;
    url: string;
};

type InvoiceHit = {
    id: number;
    uuid: string;
    number: string;
    client_name: string;
    amount_cents: number;
    currency: string;
    status_label: string;
    url: string;
};

/** Forme commune des résultats des devis, des biens et des propriétaires. */
type SearchHit = {
    id: number;
    uuid: string;
    title: string;
    subtitle: string | null;
    url: string;
};

type Destination = {
    title: string;
    keywords: string;
    url: string;
    icon: typeof LayoutGrid;
    shortcut?: string;
};

// Pages accessibles depuis la recherche. Les futures pages s'ajoutent ici.
const destinations: Destination[] = [
    {
        title: 'Tableau de bord',
        keywords: 'accueil dashboard',
        url: dashboard().url,
        icon: LayoutGrid,
        shortcut: '⌘D',
    },
    {
        title: 'Leads',
        keywords: 'kanban prospects clients statut suivi',
        url: leadsIndex().url,
        icon: Contact,
    },
    {
        title: 'Converting Machine',
        keywords: 'lead prospect nouveau formulaire qualification',
        url: leadsCreate().url,
        icon: Sparkles,
    },
    {
        title: 'Factures',
        keywords: 'leads facturation paiement',
        url: invoicesIndex().url,
        icon: FileText,
    },
    {
        title: 'Agents immobiliers',
        keywords: 'agent immobilier négociateur partenaire',
        url: agentsIndex().url,
        icon: Building2,
    },
    {
        title: 'Agences immobilières',
        keywords: 'agence immobilière partenaire',
        url: agenciesIndex().url,
        icon: Building2,
    },
    {
        title: 'Partenaires',
        keywords: 'partenaire gestion assurance banque déménagement',
        url: partnersIndex().url,
        icon: Handshake,
    },
    {
        title: 'Biens',
        keywords: 'bien logement appartement annonce visite',
        url: propertiesIndex().url,
        icon: House,
    },
    {
        title: 'Visites',
        keywords: 'visite client bien rendez-vous',
        url: clientsVisits().url,
        icon: CalendarClock,
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
];

/** Interroge une source de recherche ; toute erreur (HTTP, réseau, abandon) vaut une liste vide. */
async function fetchHits(url: string, signal: AbortSignal): Promise<unknown[]> {
    try {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal,
        });

        if (!response.ok) {
            return [];
        }

        const hits: unknown = await response.json();

        return Array.isArray(hits) ? hits : [];
    } catch {
        return [];
    }
}

/** Groupe de résultats au format commun (titre, sous-titre, fiche). */
function HitGroup({
    heading,
    kind,
    icon: Icon,
    hits,
    onSelect,
}: {
    heading: string;
    kind: string;
    icon: typeof LayoutGrid;
    hits: SearchHit[];
    onSelect: (url: string) => void;
}) {
    if (hits.length === 0) {
        return null;
    }

    return (
        <CommandGroup heading={heading}>
            {hits.map((hit) => (
                <CommandItem
                    key={hit.uuid}
                    value={`${kind} ${hit.title} ${hit.subtitle ?? ''}`}
                    onSelect={() => onSelect(hit.url)}
                >
                    <Icon />
                    <span className="truncate">{hit.title}</span>
                    {hit.subtitle && (
                        <span className="text-muted-foreground ml-auto truncate text-xs">
                            {hit.subtitle}
                        </span>
                    )}
                </CommandItem>
            ))}
        </CommandGroup>
    );
}

/**
 * Champ de recherche de l'en-tête : un clic (ou ⌘K / Ctrl+K) ouvre une
 * palette de commandes pour naviguer dans le backoffice.
 */
export function SearchCommand() {
    const [open, setOpen] = useState(false);

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
    const [leads, setLeads] = useState<LeadHit[]>([]);
    const [partners, setPartners] = useState<PartnerHit[]>([]);
    const [invoices, setInvoices] = useState<InvoiceHit[]>([]);
    const [quotes, setQuotes] = useState<SearchHit[]>([]);
    const [properties, setProperties] = useState<SearchHit[]>([]);
    const [owners, setOwners] = useState<SearchHit[]>([]);

    // Recherche côté serveur, toutes les sources en parallèle, avec un léger
    // délai pour ne pas spammer. Une source refusée (section fermée, 403) ou en
    // erreur renvoie une liste vide sans gêner les autres.
    useEffect(() => {
        const needle = query.trim();

        if (needle.length < 2) {
            setLeads([]);
            setPartners([]);
            setInvoices([]);
            setQuotes([]);
            setProperties([]);
            setOwners([]);

            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            const q = { query: { q: needle } };
            const load = <T,>(url: string, apply: (hits: T[]) => void) =>
                fetchHits(url, controller.signal).then((hits) => {
                    if (!controller.signal.aborted) {
                        apply(hits as T[]);
                    }
                });

            void Promise.allSettled([
                load<LeadHit>(leadsSearch(q).url, setLeads),
                load<PartnerHit>(partnersSearch(q).url, setPartners),
                load<InvoiceHit>(invoicesSearch(q).url, setInvoices),
                load<SearchHit>(quotesSearch(q).url, setQuotes),
                load<SearchHit>(propertiesSearch(q).url, setProperties),
                load<SearchHit>(ownersSearch(q).url, setOwners),
            ]);
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    const go = useCallback((url: string) => {
        setOpen(false);
        router.visit(url);
    }, []);

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
            >
                <CommandInput
                    placeholder="Rechercher une page, un lead ou un partenaire…"
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>Aucun résultat.</CommandEmpty>
                    {leads.length > 0 && (
                        <CommandGroup heading="Leads">
                            {leads.map((lead) => (
                                <CommandItem
                                    key={lead.id}
                                    value={`lead ${lead.name} ${lead.email ?? ''} ${lead.reference ?? ''} ${lead.company ?? ''}`}
                                    onSelect={() => go(lead.url)}
                                >
                                    <Contact />
                                    <span className="truncate">
                                        {lead.name}
                                        {lead.company && (
                                            <span className="text-muted-foreground">
                                                {' '}
                                                · {lead.company}
                                            </span>
                                        )}
                                    </span>
                                    {lead.reference && (
                                        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                                            {lead.reference}
                                        </span>
                                    )}
                                    <span className="text-muted-foreground ml-auto truncate text-xs">
                                        {lead.status_label}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    {partners.length > 0 && (
                        <CommandGroup heading="Partenaires">
                            {partners.map((partner) => {
                                const Icon =
                                    partnerTypeIcons[partner.type] ?? Handshake;

                                return (
                                    <CommandItem
                                        key={partner.uuid}
                                        value={`partenaire ${partner.name} ${partner.contact ?? ''} ${partner.type_label}`}
                                        onSelect={() => go(partner.url)}
                                    >
                                        <Icon />
                                        <span className="truncate">
                                            {partner.name}
                                            {partner.contact && (
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    · {partner.contact}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-muted-foreground ml-auto truncate text-xs">
                                            {partner.type_label}
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    )}
                    {invoices.length > 0 && (
                        <CommandGroup heading="Factures">
                            {invoices.map((invoice) => (
                                <CommandItem
                                    key={invoice.uuid}
                                    value={`facture ${invoice.number} ${invoice.client_name}`}
                                    onSelect={() => go(invoice.url)}
                                >
                                    <FileText />
                                    <span className="truncate">
                                        {invoice.number}
                                        <span className="text-muted-foreground">
                                            {' '}
                                            · {invoice.client_name} ·{' '}
                                            {formatMoney(
                                                invoice.amount_cents,
                                                invoice.currency,
                                            )}
                                        </span>
                                    </span>
                                    <span className="text-muted-foreground ml-auto truncate text-xs">
                                        {invoice.status_label}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    <HitGroup
                        heading="Devis"
                        kind="devis"
                        icon={FileSignature}
                        hits={quotes}
                        onSelect={go}
                    />
                    <HitGroup
                        heading="Biens"
                        kind="bien"
                        icon={Home}
                        hits={properties}
                        onSelect={go}
                    />
                    <HitGroup
                        heading="Propriétaires"
                        kind="propriétaire"
                        icon={KeyRound}
                        hits={owners}
                        onSelect={go}
                    />
                    <CommandGroup heading="Pages">
                        {destinations.map((destination) => (
                            <CommandItem
                                key={destination.url}
                                value={`${destination.title} ${destination.keywords}`}
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
                </CommandList>
            </CommandDialog>
        </>
    );
}
