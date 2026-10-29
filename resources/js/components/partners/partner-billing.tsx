import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import { FileSignature, FileText, Plus } from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';
import { Fold } from '@/components/leads/lead-show-body';
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

/**
 * Un document de l'historique, en carte grise comme le reste de la fiche
 * (28 octobre 2026) : le numéro en lien et le statut en tête, la date et le
 * montant dessous.
 */
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
        <li className="bg-sidebar grid gap-1.5 rounded-lg border p-3 text-sm">
            <span className="flex flex-wrap items-center justify-between gap-2">
                <Link
                    href={href}
                    className="inline-flex min-w-0 items-center gap-2 font-medium underline-offset-4 hover:underline"
                >
                    <span
                        aria-hidden
                        className="bg-background text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md border"
                    >
                        <Icon className="size-4" />
                    </span>
                    {number}
                </Link>
                {badge}
            </span>
            <span className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>Émis le {formatDate(issuedAt)}</span>
                <span className="text-foreground text-sm font-medium tabular-nums">
                    {amount}
                </span>
            </span>
        </li>
    );
}

/**
 * Historique commercial avec un partenaire, en **deux accordéons** (28 octobre
 * 2026) : les devis puis les factures qui lui ont été adressés, chacun avec
 * son bouton de création prérempli. Un accordéon n'existe que si le membre a
 * le droit correspondant — le serveur refuse de toute façon.
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
    return (
        <>
            {can.quotes && (
                <Fold
                    title="Devis"
                    icon={FileSignature}
                    count={quotes.length}
                    defaultOpen={quotes.length > 0}
                    storageKey={`partner.${partnerUuid}.quotes`}
                    action={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground size-7 rounded-full"
                            aria-label="Nouveau devis"
                            title="Nouveau devis"
                            asChild
                        >
                            <Link
                                href={quoteCreate({
                                    query: { partner: partnerUuid },
                                })}
                            >
                                <Plus aria-hidden />
                            </Link>
                        </Button>
                    }
                >
                    {quotes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Aucun devis avec ce partenaire pour le moment.
                        </p>
                    ) : (
                        <ul role="list" className="grid gap-2">
                            {quotes.map((quote) => (
                                <DocumentRow
                                    key={quote.uuid}
                                    href={quoteShow({ quote: quote.uuid })}
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
                    )}
                </Fold>
            )}
            {can.invoices && (
                <Fold
                    title="Factures"
                    icon={FileText}
                    count={invoices.length}
                    defaultOpen={invoices.length > 0}
                    storageKey={`partner.${partnerUuid}.invoices`}
                    action={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground size-7 rounded-full"
                            aria-label="Nouvelle facture"
                            title="Nouvelle facture"
                            asChild
                        >
                            <Link
                                href={invoiceCreate({
                                    query: { partner: partnerUuid },
                                })}
                            >
                                <Plus aria-hidden />
                            </Link>
                        </Button>
                    }
                >
                    {invoices.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Aucune facture avec ce partenaire pour le moment.
                        </p>
                    ) : (
                        <ul role="list" className="grid gap-2">
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
                                        <InvoiceStatusBadge
                                            status={invoice.status}
                                            label={invoice.status_label}
                                        />
                                    }
                                />
                            ))}
                        </ul>
                    )}
                </Fold>
            )}
        </>
    );
}
