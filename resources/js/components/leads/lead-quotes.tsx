import { Link } from '@inertiajs/react';
import { FilePlus2, FileSignature, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { linkQuote } from '@/components/quotes/quote-lead-link';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';
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
import { formatDate, formatMoney } from '@/lib/format';
import {
    create as quoteCreate,
    search as quotesSearch,
    show as quoteShow,
} from '@/routes/tools/quotes';
import type { LeadQuote, QuoteSearchHit } from '@/types';

/**
 * Devis rattachés à un lead : liste, création préremplie depuis la fiche et
 * rattachement d'un devis existant (recherche par numéro ou client), comme
 * les factures.
 */
export function LeadQuotes({
    leadId,
    leadUuid,
    quotes,
    canEdit,
}: {
    leadId: number;
    /** Identifiant public du lead, pour le lien de création préremplie. */
    leadUuid: string;
    quotes: LeadQuote[];
    canEdit: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<QuoteSearchHit[]>([]);

    useEffect(() => {
        const needle = query.trim();

        if (needle.length < 2) {
            setHits([]);

            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(quotesSearch({ query: { q: needle } }).url, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then((response) => (response.ok ? response.json() : []))
                .then((data: QuoteSearchHit[]) => setHits(data))
                .catch(() => undefined);
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    return (
        <div className="grid gap-3" data-test="lead-quotes">
            {quotes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucun devis pour ce lead.
                </p>
            ) : (
                <ul role="list" className="grid gap-2">
                    {quotes.map((quote) => (
                        <li
                            key={quote.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                            <Link
                                href={quoteShow({ quote: quote.uuid })}
                                className="inline-flex min-w-0 items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                            >
                                <FileSignature
                                    className="text-muted-foreground size-4 shrink-0"
                                    aria-hidden
                                />
                                {quote.number}
                                <span className="text-muted-foreground truncate font-normal">
                                    · {formatDate(quote.issued_at)}
                                </span>
                            </Link>
                            <span className="flex items-center gap-2">
                                <span className="tabular-nums">
                                    {formatMoney(
                                        quote.amount_cents,
                                        quote.currency,
                                    )}
                                </span>
                                <QuoteStatusBadge
                                    status={quote.status}
                                    label={quote.status_label}
                                />
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {canEdit && (
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={quoteCreate({ query: { lead: leadUuid } })}>
                            <FilePlus2 aria-hidden />
                            Créer un devis
                        </Link>
                    </Button>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="sm">
                                <Link2 aria-hidden />
                                Lier un devis existant
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Numéro ou client du devis…"
                                    value={query}
                                    onValueChange={setQuery}
                                />
                                <CommandList>
                                    <CommandEmpty>
                                        {query.trim().length < 2
                                            ? 'Tapez au moins deux caractères.'
                                            : 'Aucun devis trouvé.'}
                                    </CommandEmpty>
                                    <CommandGroup>
                                        {hits.map((hit) => (
                                            <CommandItem
                                                key={hit.id}
                                                value={String(hit.id)}
                                                disabled={
                                                    hit.lead?.id === leadId
                                                }
                                                onSelect={() =>
                                                    linkQuote(
                                                        hit.uuid,
                                                        { lead_id: leadId },
                                                        () => {
                                                            setOpen(false);
                                                            setQuery('');
                                                        },
                                                    )
                                                }
                                            >
                                                <span className="grid min-w-0 flex-1">
                                                    <span className="truncate font-medium">
                                                        {hit.number} ·{' '}
                                                        {hit.client_name}
                                                    </span>
                                                    <span className="text-muted-foreground truncate text-xs">
                                                        {formatMoney(
                                                            hit.amount_cents,
                                                            hit.currency,
                                                        )}{' '}
                                                        · {hit.status_label}
                                                        {hit.lead
                                                            ? hit.lead.id ===
                                                              leadId
                                                                ? ' · déjà rattaché'
                                                                : ` · rattaché à ${hit.lead.name}`
                                                            : ''}
                                                    </span>
                                                </span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            )}
        </div>
    );
}
