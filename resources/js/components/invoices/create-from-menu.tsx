import { router } from '@inertiajs/react';
import { FileSignature, MoreHorizontal, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { search as leadsSearch } from '@/routes/leads';
import {
    invoice as quoteToInvoice,
    search as quotesSearch,
} from '@/routes/tools/quotes';

type Hit = {
    uuid: string;
    /** Titre affiché (nom du client, numéro du devis). */
    title: string;
    subtitle: string | null;
};

/** Deux caractères au moins avant d'interroger le serveur. */
const MIN_QUERY = 2;

/** Résultats d'une recherche JSON du backoffice, ou rien en cas d'échec. */
async function fetchHits(url: string, signal: AbortSignal): Promise<unknown[]> {
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
}

/** Dialogue de recherche : on tape, on choisit, l'appelant agit. */
function PickerDialog({
    open,
    onOpenChange,
    title,
    placeholder,
    empty,
    url,
    map,
    onPick,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    placeholder: string;
    empty: string;
    /** Construit l'URL de recherche pour la saisie courante. */
    url: (query: string) => string;
    /** Met un résultat JSON à la forme commune (titre, sous-titre). */
    map: (hit: never) => Hit;
    onPick: (hit: Hit) => void;
}) {
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<Hit[]>([]);

    useEffect(() => {
        if (!open || query.trim().length < MIN_QUERY) {
            setHits([]);

            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            void fetchHits(url(query.trim()), controller.signal)
                .then((raw) => setHits(raw.map((hit) => map(hit as never))))
                .catch(() => setHits([]));
        }, 250);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [open, query, url, map]);

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={placeholder}
        >
            <CommandInput
                placeholder={placeholder}
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>{empty}</CommandEmpty>
                <CommandGroup heading={title}>
                    {hits.map((hit) => (
                        <CommandItem
                            key={hit.uuid}
                            value={`${hit.title} ${hit.subtitle ?? ''}`}
                            onSelect={() => {
                                onOpenChange(false);
                                setQuery('');
                                onPick(hit);
                            }}
                        >
                            <span className="font-medium">{hit.title}</span>
                            {hit.subtitle && (
                                <span className="text-muted-foreground truncate text-xs">
                                    {hit.subtitle}
                                </span>
                            )}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}

/**
 * Menu « ⋯ » des pages Nouvelle facture et Nouveau devis : partir d'un devis
 * existant (facture seulement) ou reprendre les coordonnées d'un client.
 */
export function CreateFromMenu({
    kind,
    createUrl,
}: {
    kind: 'invoice' | 'quote';
    /** Page de création, à rouvrir avec `?lead=UUID` pour préremplir. */
    createUrl: string;
}) {
    const [picking, setPicking] = useState<'quote' | 'client' | null>(null);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Autres façons de commencer"
                    >
                        <MoreHorizontal aria-hidden />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {kind === 'invoice' && (
                        <DropdownMenuItem onSelect={() => setPicking('quote')}>
                            <FileSignature aria-hidden />
                            Depuis un devis
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => setPicking('client')}>
                        <UserRound aria-hidden />
                        Depuis un client
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <PickerDialog
                open={picking === 'quote'}
                onOpenChange={(open) => setPicking(open ? 'quote' : null)}
                title="Devis"
                placeholder="Rechercher un devis (numéro, client)…"
                empty="Aucun devis ne correspond."
                url={(query) => quotesSearch({ query: { q: query } }).url}
                map={(hit: {
                    uuid: string;
                    title: string;
                    subtitle: string | null;
                }) => hit}
                onPick={(hit) =>
                    router.post(quoteToInvoice({ quote: hit.uuid }).url)
                }
            />
            <PickerDialog
                open={picking === 'client'}
                onOpenChange={(open) => setPicking(open ? 'client' : null)}
                title="Clients"
                placeholder="Rechercher un client (nom, référence)…"
                empty="Aucun client ne correspond."
                url={(query) => leadsSearch({ query: { q: query } }).url}
                map={(hit: {
                    uuid: string;
                    name: string;
                    reference: string | null;
                    company: string | null;
                }) => ({
                    uuid: hit.uuid,
                    title: hit.name,
                    subtitle:
                        [hit.reference, hit.company]
                            .filter(Boolean)
                            .join(' · ') || null,
                })}
                onPick={(hit) => router.get(createUrl, { lead: hit.uuid })}
            />
        </>
    );
}
