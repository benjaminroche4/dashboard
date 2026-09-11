import { Head, Link, router, usePage } from '@inertiajs/react';
import { Check, Download, Pencil, Receipt, Send, X } from 'lucide-react';
import { useState } from 'react';
import { CreatedBy } from '@/components/created-by';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { DeclineQuoteDialog } from '@/components/quotes/decline-quote-dialog';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';
import { SendQuoteDialog } from '@/components/quotes/send-quote-dialog';
import { Button } from '@/components/ui/button';
import { downloadQuotePdf } from '@/lib/download-quote-pdf';
import { formatDate, formatMoney } from '@/lib/format';
import { quoteFormToInvoiceForm, quoteToForm } from '@/lib/quote-form';
import { cn } from '@/lib/utils';
import { QuoteLeadLink } from '@/components/quotes/quote-lead-link';
import { show as invoiceShow } from '@/routes/invoices';
import { index as toolsIndex } from '@/routes/tools';
import {
    accept,
    edit as quoteEdit,
    index as quotesIndex,
    invoice as invoiceQuote,
} from '@/routes/tools/quotes';
import type {
    Company,
    Offer,
    QuoteDetail,
    QuoteStatus,
    QuoteStatusChange,
} from '@/types';

type Props = {
    quote: QuoteDetail;
    history: QuoteStatusChange[];
    company: Company;
    offers: Offer[];
};

const dotClasses: Record<QuoteStatus, string> = {
    draft: 'bg-neutral-400',
    sent: 'bg-sky-500',
    accepted: 'bg-green-500',
    declined: 'bg-red-500',
    expired: 'bg-amber-500',
    invoiced: 'bg-neutral-600',
};

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export default function QuotesShow({ quote, history, company, offers }: Props) {
    const [sending, setSending] = useState(false);
    const [declining, setDeclining] = useState(false);
    const { auth } = usePage().props;
    const canManage = auth.user.role !== 'member';

    const post = (url: string) =>
        router.post(url, {}, { preserveScroll: true });

    return (
        <>
            <Head title={`Devis ${quote.number}`} />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-medium">
                                Devis {quote.number}
                            </h1>
                            <QuoteStatusBadge
                                status={quote.status}
                                label={quote.status_label}
                            />
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {quote.client_name} ·{' '}
                            {formatMoney(quote.amount_cents, quote.currency)} ·
                            valable jusqu'au {formatDate(quote.valid_until)} ·{' '}
                            <CreatedBy
                                name={quote.created_by}
                                avatar={quote.created_by_avatar}
                                date={quote.issued_at}
                                verb="créé par"
                            />
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                downloadQuotePdf(quote.uuid, quote.number)
                            }
                        >
                            <Download />
                            PDF
                        </Button>
                        {canManage && quote.can_edit && (
                            <Button variant="outline" asChild>
                                <Link href={quoteEdit({ quote: quote.uuid })}>
                                    <Pencil />
                                    Modifier
                                </Link>
                            </Button>
                        )}
                        {canManage && quote.can_send && (
                            <Button
                                variant="outline"
                                onClick={() => setSending(true)}
                                data-test="send-quote"
                            >
                                <Send />
                                Envoyer au client
                            </Button>
                        )}
                        {canManage && quote.can_decline && (
                            <Button
                                variant="outline"
                                onClick={() => setDeclining(true)}
                                data-test="decline-quote"
                            >
                                <X />
                                Refusé
                            </Button>
                        )}
                        {canManage && quote.can_accept && (
                            <Button
                                variant={
                                    quote.can_invoice ? 'outline' : 'default'
                                }
                                onClick={() =>
                                    post(accept({ quote: quote.uuid }).url)
                                }
                                data-test="accept-quote"
                            >
                                <Check />
                                Accepté
                            </Button>
                        )}
                        {canManage && quote.can_invoice && (
                            <Button
                                onClick={() =>
                                    post(
                                        invoiceQuote({ quote: quote.uuid }).url,
                                    )
                                }
                                data-test="invoice-quote"
                            >
                                <Receipt />
                                Créer la facture
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <section className="bg-sidebar rounded-xl border p-2">
                        <InvoicePreview
                            kind="quote"
                            form={quoteFormToInvoiceForm(quoteToForm(quote))}
                            company={company}
                            offers={offers.map((offer) => ({
                                ...offer,
                                prices: { CHF: 0, EUR: 0 },
                            }))}
                            number={quote.number}
                        />
                    </section>

                    <aside className="flex flex-col gap-6">
                        <QuoteLeadLink
                            quoteUuid={quote.uuid}
                            lead={quote.lead}
                            canEdit={canManage}
                        />
                        {quote.invoice && (
                            <section className="grid gap-2 text-sm">
                                <p>
                                    <span className="text-muted-foreground">
                                        Facture :{' '}
                                    </span>
                                    <Link
                                        href={invoiceShow({
                                            invoice: quote.invoice.uuid,
                                        })}
                                        className="font-medium underline-offset-4 hover:underline"
                                    >
                                        {quote.invoice.number}
                                    </Link>
                                </p>
                            </section>
                        )}
                        <section className="grid gap-3">
                            <h2 className="text-base font-medium">
                                Historique
                            </h2>
                            <ol
                                role="list"
                                className="before:bg-border relative grid gap-4 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px"
                            >
                                {history.map((change) => (
                                    <li
                                        key={change.id}
                                        className="relative flex gap-4 pl-6 text-sm"
                                    >
                                        <span
                                            className={cn(
                                                'ring-background absolute top-1 left-0 size-4 rounded-full ring-4',
                                                dotClasses[change.to_status],
                                            )}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p>
                                                <span className="font-medium">
                                                    {change.to}
                                                </span>
                                                {change.from && (
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        (depuis {change.from})
                                                    </span>
                                                )}
                                            </p>
                                            {change.note && (
                                                <p className="text-muted-foreground">
                                                    {change.note}
                                                </p>
                                            )}
                                            <p className="text-muted-foreground text-xs">
                                                {dateTime.format(
                                                    new Date(change.at),
                                                )}
                                                {change.by
                                                    ? ` · ${change.by}`
                                                    : ' · automatique'}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        <section className="text-muted-foreground grid gap-1 text-sm">
                            {quote.sent_at && (
                                <p>
                                    Envoyé le{' '}
                                    {dateTime.format(new Date(quote.sent_at))}.
                                </p>
                            )}
                            {quote.accepted_at && (
                                <p>
                                    Accepté le{' '}
                                    {dateTime.format(
                                        new Date(quote.accepted_at),
                                    )}
                                    .
                                </p>
                            )}
                            {quote.declined_at && (
                                <p>
                                    Refusé le{' '}
                                    {dateTime.format(
                                        new Date(quote.declined_at),
                                    )}
                                    .
                                </p>
                            )}
                        </section>
                    </aside>
                </div>
            </div>

            <SendQuoteDialog
                quoteUuid={quote.uuid}
                quoteNumber={quote.number}
                clientEmail={quote.client_email}
                open={sending}
                onOpenChange={setSending}
            />
            <DeclineQuoteDialog
                quoteUuid={quote.uuid}
                quoteNumber={quote.number}
                open={declining}
                onOpenChange={setDeclining}
            />
        </>
    );
}

// Objet et non fonction : Inertia v3 traiterait une fonction comme un composant de layout.
QuotesShow.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Devis', href: quotesIndex() },
        { title: 'Détail', href: '#' },
    ],
};
