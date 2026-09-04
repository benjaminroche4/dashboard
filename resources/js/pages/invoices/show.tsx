import { Head, Link, router } from '@inertiajs/react';
import { Check, Download, Send } from 'lucide-react';
import { useState } from 'react';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { MarkPaidDialog } from '@/components/invoices/mark-paid-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/format';
import { invoiceToForm } from '@/lib/invoice-to-form';
import { cn } from '@/lib/utils';
import { index as invoicesIndex, pdf, send, show } from '@/routes/invoices';
import type {
    Company,
    InvoiceDetail,
    InvoiceStatus,
    InvoiceStatusChange,
    Offer,
} from '@/types';

type Props = {
    invoice: InvoiceDetail;
    history: InvoiceStatusChange[];
    company: Company;
    offers: Offer[];
};

export const statusClasses: Record<InvoiceStatus, string> = {
    paid: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    sent: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    overdue: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    draft: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    cancelled:
        'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export default function InvoicesShow({
    invoice,
    history,
    company,
    offers,
}: Props) {
    const [paying, setPaying] = useState(false);
    const [sending, setSending] = useState(false);

    const sendInvoice = () => {
        setSending(true);
        router.post(
            send({ invoice: invoice.id }).url,
            {},
            { preserveScroll: true, onFinish: () => setSending(false) },
        );
    };

    return (
        <>
            <Head title={`Facture ${invoice.number}`} />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-medium">
                                Facture {invoice.number}
                            </h1>
                            <Badge
                                variant="secondary"
                                data-status={invoice.status}
                                className={statusClasses[invoice.status]}
                            >
                                {invoice.status_label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {invoice.client_name} ·{' '}
                            {formatMoney(
                                invoice.amount_cents,
                                invoice.currency,
                            )}
                            {invoice.deposit_cents > 0 && (
                                <>
                                    {' '}
                                    · reste à payer{' '}
                                    {formatMoney(
                                        invoice.due_cents,
                                        invoice.currency,
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <a
                                href={pdf({ invoice: invoice.id }).url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Download />
                                PDF
                            </a>
                        </Button>
                        {invoice.can_send && (
                            <Button
                                variant="outline"
                                onClick={sendInvoice}
                                disabled={sending}
                                data-test="send-invoice"
                            >
                                {sending ? <Spinner /> : <Send />}
                                Envoyer au client
                            </Button>
                        )}
                        {invoice.can_pay && (
                            <Button
                                onClick={() => setPaying(true)}
                                data-test="mark-paid"
                            >
                                <Check />
                                Marquer payée
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <section className="bg-sidebar rounded-xl border p-2">
                        <InvoicePreview
                            form={invoiceToForm(invoice)}
                            company={company}
                            offers={offers.map((offer) => ({
                                ...offer,
                                prices: { CHF: 0, EUR: 0 },
                            }))}
                            number={invoice.number}
                        />
                    </section>

                    <aside className="flex flex-col gap-6">
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
                                                change.to_status === 'paid'
                                                    ? 'bg-green-500'
                                                    : change.to_status ===
                                                        'overdue'
                                                      ? 'bg-red-500'
                                                      : change.to_status ===
                                                          'sent'
                                                        ? 'bg-sky-500'
                                                        : 'bg-neutral-400',
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
                            {invoice.created_by && (
                                <p>Créée par {invoice.created_by}.</p>
                            )}
                            {invoice.sent_at && (
                                <p>
                                    Envoyée le{' '}
                                    {dateTime.format(new Date(invoice.sent_at))}
                                    .
                                </p>
                            )}
                            {invoice.paid_at && (
                                <p>Payée le {invoice.paid_at}.</p>
                            )}
                        </section>

                        <Button variant="ghost" className="self-start" asChild>
                            <Link href={invoicesIndex()}>
                                ← Retour à la liste
                            </Link>
                        </Button>
                    </aside>
                </div>
            </div>

            <MarkPaidDialog
                invoiceId={invoice.id}
                invoiceNumber={invoice.number}
                open={paying}
                onOpenChange={setPaying}
            />
        </>
    );
}

InvoicesShow.layout = (page: { props: Props }) => ({
    breadcrumbs: [
        { title: 'Leads', href: '#' },
        { title: 'Factures', href: invoicesIndex() },
        {
            title: page.props.invoice.number,
            href: show({ invoice: page.props.invoice.id }),
        },
    ],
});
