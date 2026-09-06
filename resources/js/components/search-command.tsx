import { router } from '@inertiajs/react';
import {
    Contact,
    FileText,
    LayoutGrid,
    Palette,
    Search,
    ShieldCheck,
    Sparkles,
    UserCircle,
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
import { index as invoicesIndex } from '@/routes/invoices';
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

    // Recherche de leads côté serveur, avec un léger délai pour ne pas spammer.
    useEffect(() => {
        const needle = query.trim();

        if (needle.length < 2) {
            setLeads([]);

            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(leadsSearch({ query: { q: needle } }).url, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then((response) => (response.ok ? response.json() : []))
                .then((hits: LeadHit[]) => setLeads(hits))
                .catch(() => undefined);
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
                    placeholder="Rechercher une page ou un lead…"
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
