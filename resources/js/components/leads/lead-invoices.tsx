import { Link } from '@inertiajs/react';
import { FilePlus2, Link2, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { linkInvoice } from '@/components/invoices/invoice-lead-link';
import { Badge } from '@/components/ui/badge';
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
    create as invoiceCreate,
    search as invoicesSearch,
    show as invoiceShow,
} from '@/routes/invoices';
import type { InvoiceSearchHit, LeadInvoice } from '@/types';

/**
 * Factures rattachées à un lead : liste, rattachement d'une facture
 * existante (recherche par numéro ou client) et création préremplie.
 */
export function LeadInvoices({
    leadId,
    leadUuid,
    invoices,
    canEdit,
}: {
    leadId: number;
    /** Identifiant public du lead, pour le lien de création préremplie. */
    leadUuid: string;
    invoices: LeadInvoice[];
    canEdit: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<InvoiceSearchHit[]>([]);

    useEffect(() => {
        const needle = query.trim();

        if (needle.length < 2) {
            setHits([]);

            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(invoicesSearch({ query: { q: needle } }).url, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then((response) => (response.ok ? response.json() : []))
                .then((data: InvoiceSearchHit[]) => setHits(data))
                .catch(() => undefined);
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    return (
        <div className="grid gap-3" data-test="lead-invoices">
            {invoices.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucune facture pour ce lead.
                </p>
            ) : (
                <ul role="list" className="grid gap-2">
                    {invoices.map((invoice) => (
                        <li
                            key={invoice.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                            <Link
                                href={invoiceShow({ invoice: invoice.uuid })}
                                className="inline-flex min-w-0 items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                            >
                                <Receipt
                                    className="text-muted-foreground size-4 shrink-0"
                                    aria-hidden
                                />
                                {invoice.number}
                                <span className="text-muted-foreground truncate font-normal">
                                    · {formatDate(invoice.issued_at)}
                                </span>
                            </Link>
                            <span className="flex items-center gap-2">
                                <span className="tabular-nums">
                                    {formatMoney(
                                        invoice.amount_cents,
                                        invoice.currency,
                                    )}
                                </span>
                                <Badge
                                    variant="secondary"
                                    data-status={invoice.status}
                                >
                                    {invoice.status_label}
                                </Badge>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {canEdit && (
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            href={invoiceCreate({ query: { lead: leadUuid } })}
                        >
                            <FilePlus2 aria-hidden />
                            Créer une facture
                        </Link>
                    </Button>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="sm">
                                <Link2 aria-hidden />
                                Lier une facture existante
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Numéro ou client de la facture…"
                                    value={query}
                                    onValueChange={setQuery}
                                />
                                <CommandList>
                                    <CommandEmpty>
                                        {query.trim().length < 2
                                            ? 'Tapez au moins deux caractères.'
                                            : 'Aucune facture trouvée.'}
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
                                                    linkInvoice(
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
                                                                ? ' · déjà rattachée'
                                                                : ` · rattachée à ${hit.lead.name}`
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
