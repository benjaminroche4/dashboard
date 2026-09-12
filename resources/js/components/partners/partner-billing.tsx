import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import { FilePlus2, FileSignature, FileText, ReceiptText } from 'lucide-react';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/lib/format';
import {
    create as invoiceCreate,
    show as invoiceShow,
} from '@/routes/invoices';
import {
    create as quoteCreate,
    show as quoteShow,
} from '@/routes/tools/quotes';
import type { LeadInvoice, LeadQuote, PartnerAbilities } from '@/types';

/** Un document de l'historique : numéro cliquable, date, montant, statut. */
function DocumentRow({
    href,
    icon: Icon,
    number,
    issuedAt,
    amount,
    badge,
}: {
    href: ComponentProps<typeof Link>['href'];
    icon: typeof FileSignature;
    number: string;
    issuedAt: string;
    amount: string;
    badge: ReactNode;
}) {
    return (
        <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
            <Link
                href={href}
                className="inline-flex min-w-0 items-center gap-1.5 font-medium underline-offset-4 hover:underline"
            >
                <Icon
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                />
                {number}
                <span className="text-muted-foreground truncate font-normal">
                    · {formatDate(issuedAt)}
                </span>
            </Link>
            <span className="flex items-center gap-2">
                <span className="tabular-nums">{amount}</span>
                {badge}
            </span>
        </li>
    );
}

/**
 * Historique commercial avec un partenaire : les devis et les factures qui lui
 * ont été adressés, et de quoi en créer un nouveau, prérempli avec ses
 * coordonnées. Masqué pour un membre qui n'a le droit ni sur l'un ni sur
 * l'autre — le serveur refuse de toute façon.
 */
export function PartnerBilling({
    partnerUuid,
    quotes,
    invoices,
    can,
}: {
    partnerUuid: string;
    quotes: LeadQuote[];
    invoices: LeadInvoice[];
    can: PartnerAbilities;
}) {
    if (!can.quotes && !can.invoices) {
        return null;
    }

    const total = quotes.length + invoices.length;

    return (
        <section
            aria-label="Devis et factures"
            className="bg-sidebar grid gap-3 rounded-xl border p-4"
        >
            <header className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-medium">
                    <ReceiptText className="size-4" aria-hidden />
                    Devis et factures
                    <Badge
                        variant="secondary"
                        className="font-medium tabular-nums"
                    >
                        {total}
                    </Badge>
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    {can.quotes && (
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={quoteCreate({
                                    query: { partner: partnerUuid },
                                })}
                            >
                                <FilePlus2 aria-hidden />
                                Nouveau devis
                            </Link>
                        </Button>
                    )}
                    {can.invoices && (
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={invoiceCreate({
                                    query: { partner: partnerUuid },
                                })}
                            >
                                <FilePlus2 aria-hidden />
                                Nouvelle facture
                            </Link>
                        </Button>
                    )}
                </div>
            </header>
            <div className="bg-background grid gap-4 rounded-lg border p-4">
                {total === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucun devis ni facture avec ce partenaire pour le
                        moment.
                    </p>
                ) : (
                    <>
                        {quotes.length > 0 && (
                            <div className="grid gap-1">
                                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                    Devis
                                </h3>
                                <ul
                                    role="list"
                                    className="divide-border grid divide-y"
                                >
                                    {quotes.map((quote) => (
                                        <DocumentRow
                                            key={quote.uuid}
                                            href={quoteShow({
                                                quote: quote.uuid,
                                            })}
                                            icon={FileSignature}
                                            number={quote.number}
                                            issuedAt={quote.issued_at}
                                            amount={formatMoney(
                                                quote.amount_cents,
                                                quote.currency,
                                            )}
                                            badge={
                                                <QuoteStatusBadge
                                                    status={quote.status}
                                                    label={quote.status_label}
                                                />
                                            }
                                        />
                                    ))}
                                </ul>
                            </div>
                        )}
                        {invoices.length > 0 && (
                            <div className="grid gap-1">
                                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                    Factures
                                </h3>
                                <ul
                                    role="list"
                                    className="divide-border grid divide-y"
                                >
                                    {invoices.map((invoice) => (
                                        <DocumentRow
                                            key={invoice.uuid}
                                            href={invoiceShow({
                                                invoice: invoice.uuid,
                                            })}
                                            icon={FileText}
                                            number={invoice.number}
                                            issuedAt={invoice.issued_at}
                                            amount={formatMoney(
                                                invoice.amount_cents,
                                                invoice.currency,
                                            )}
                                            badge={
                                                <Badge
                                                    variant="secondary"
                                                    data-status={invoice.status}
                                                >
                                                    {invoice.status_label}
                                                </Badge>
                                            }
                                        />
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
