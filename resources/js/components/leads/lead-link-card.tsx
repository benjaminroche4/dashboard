import { Link } from '@inertiajs/react';
import { Check, FolderOpen, Link2, Unlink, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { show as clientShow } from '@/routes/clients';
import { search as leadsSearch, show as leadShow } from '@/routes/leads';

type Hit = { id: number; name: string; email: string | null };

/** Lead (ou dossier client) rattaché à un document. */
export type LinkedLead = {
    id: number;
    uuid: string;
    name: string;
    /** Lead converti : c'est un dossier client, il s'ouvre comme tel. */
    is_client: boolean;
};

/**
 * Carte « Lead ou client » d'un devis, d'une facture ou d'une liste de pièces :
 * lien vers la fiche du lead ou vers son dossier client, recherche d'un lead à
 * rattacher (nom, e-mail, téléphone) et détachement. Le rattachement lui-même
 * est confié à l'appelant, qui connaît sa route.
 */
export function LeadLinkCard({
    lead,
    canEdit,
    busy = false,
    onLink,
}: {
    lead: LinkedLead | null;
    canEdit: boolean;
    busy?: boolean;
    /** `null` détache. */
    onLink: (leadId: number | null, done: () => void) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<Hit[]>([]);

    useEffect(() => {
        const needle = query.trim();

        if (needle.length < 2) {
            setHits([]);

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
                .then((data: Hit[]) => setHits(data))
                .catch(() => undefined);
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    return (
        <section aria-label="Lead ou client" className="grid gap-2">
            <h2 className="text-base font-medium">Lead ou client</h2>
            {lead ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link
                        href={
                            lead.is_client
                                ? clientShow({ lead: lead.uuid })
                                : leadShow({ lead: lead.uuid })
                        }
                        className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                    >
                        {lead.is_client ? (
                            <FolderOpen
                                className="text-muted-foreground size-4"
                                aria-hidden
                            />
                        ) : (
                            <UserRound
                                className="text-muted-foreground size-4"
                                aria-hidden
                            />
                        )}
                        {lead.name}
                        <span className="text-muted-foreground font-normal">
                            {lead.is_client ? '· dossier client' : '· lead'}
                        </span>
                    </Link>
                    {canEdit && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => onLink(null, () => undefined)}
                        >
                            <Unlink aria-hidden />
                            Détacher
                        </Button>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">
                    Aucun lead ni dossier client rattaché.
                </p>
            )}
            {canEdit && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-fit"
                        >
                            <Link2 aria-hidden />
                            {lead ? 'Changer' : 'Lier à un lead ou un client'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Nom, e-mail ou téléphone…"
                                value={query}
                                onValueChange={setQuery}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {query.trim().length < 2
                                        ? 'Tapez au moins deux caractères.'
                                        : 'Aucun lead ni client trouvé.'}
                                </CommandEmpty>
                                <CommandGroup>
                                    {hits.map((hit) => (
                                        <CommandItem
                                            key={hit.id}
                                            value={String(hit.id)}
                                            onSelect={() =>
                                                onLink(hit.id, () => {
                                                    setOpen(false);
                                                    setQuery('');
                                                })
                                            }
                                        >
                                            <span className="grid min-w-0">
                                                <span className="truncate font-medium">
                                                    {hit.name}
                                                </span>
                                                {hit.email && (
                                                    <span className="text-muted-foreground truncate text-xs">
                                                        {hit.email}
                                                    </span>
                                                )}
                                            </span>
                                            {lead?.id === hit.id && (
                                                <Check
                                                    className="ml-auto size-4"
                                                    aria-hidden
                                                />
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        </section>
    );
}
