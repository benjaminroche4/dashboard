import { Link, router } from '@inertiajs/react';
import { Check, Link2, Unlink, UserRound } from 'lucide-react';
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
import { notify } from '@/lib/toast';
import { link } from '@/routes/tools/documents';
import { search as leadsSearch, show as leadShow } from '@/routes/leads';

type Hit = { id: number; name: string; email: string | null };

/** PATCH tools.documents.link : rattache (id) ou détache (null) la liste. */
export function linkDocumentRequest(
    requestUuid: string,
    leadId: number | null,
    onDone?: () => void,
) {
    router.patch(
        link({ documentRequest: requestUuid }).url,
        { lead_id: leadId },
        {
            preserveScroll: true,
            onSuccess: onDone,
            onError: (errors) =>
                notify.error(
                    'Rattachement impossible',
                    Object.values(errors)[0] ?? 'Réessayez.',
                ),
        },
    );
}

/**
 * Lead rattaché à une liste de documents : lien vers sa fiche, recherche d'un
 * lead à rattacher (nom, e-mail, téléphone) et détachement. Une liste créée
 * sans lead peut donc lui être reliée depuis sa fiche.
 */
export function DocumentRequestLeadLink({
    requestUuid,
    lead,
    canEdit,
}: {
    requestUuid: string;
    lead: { id: number; uuid: string; name: string } | null;
    canEdit: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<Hit[]>([]);
    const [busy, setBusy] = useState(false);

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

    const choose = (hit: Hit) => {
        setBusy(true);
        linkDocumentRequest(requestUuid, hit.id, () => {
            setOpen(false);
            setQuery('');
        });
        setBusy(false);
    };

    return (
        <div className="grid gap-2">
            {lead ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link
                        href={leadShow({ lead: lead.uuid })}
                        className="inline-flex min-w-0 items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                    >
                        <UserRound
                            className="text-muted-foreground size-4"
                            aria-hidden
                        />
                        {lead.name}
                    </Link>
                    {canEdit && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                                linkDocumentRequest(requestUuid, null)
                            }
                        >
                            <Unlink aria-hidden />
                            Détacher
                        </Button>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">
                    Aucun lead rattaché à cette liste.
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
                            {lead ? 'Changer de lead' : 'Lier à un lead'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Nom, e-mail ou téléphone du lead…"
                                value={query}
                                onValueChange={setQuery}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {query.trim().length < 2
                                        ? 'Tapez au moins deux caractères.'
                                        : 'Aucun lead trouvé.'}
                                </CommandEmpty>
                                <CommandGroup>
                                    {hits.map((hit) => (
                                        <CommandItem
                                            key={hit.id}
                                            value={String(hit.id)}
                                            onSelect={() => choose(hit)}
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
        </div>
    );
}
