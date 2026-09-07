import { Link } from '@inertiajs/react';
import { FilePlus2, FileSignature } from 'lucide-react';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/lib/format';
import {
    create as quoteCreate,
    show as quoteShow,
} from '@/routes/tools/quotes';
import type { LeadQuote } from '@/types';

/**
 * Devis rattachés à un lead : liste et création préremplie depuis la fiche.
 */
export function LeadQuotes({
    leadUuid,
    quotes,
    canEdit,
}: {
    leadUuid: string;
    quotes: LeadQuote[];
    canEdit: boolean;
}) {
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
                <div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={quoteCreate({ query: { lead: leadUuid } })}>
                            <FilePlus2 aria-hidden />
                            Créer un devis
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
