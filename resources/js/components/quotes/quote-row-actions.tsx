import { Link, router } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { DeclineQuoteDialog } from '@/components/quotes/decline-quote-dialog';
import { SendQuoteDialog } from '@/components/quotes/send-quote-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadQuotePdf } from '@/lib/download-quote-pdf';
import { show as invoiceShow } from '@/routes/invoices';
import { accept, invoice, show } from '@/routes/tools/quotes';
import type { Quote } from '@/types';

/**
 * Menu « … » d'une ligne de la liste : voir, PDF, envoyer, accepter, refuser, facturer.
 */
export function QuoteRowActions({
    quote,
    canManage,
}: {
    quote: Quote;
    /** Managers et admins : les membres consultent seulement. */
    canManage: boolean;
}) {
    const [sending, setSending] = useState(false);
    const [declining, setDeclining] = useState(false);

    const post = (url: string) =>
        router.post(url, {}, { preserveScroll: true });

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="size-8 p-0"
                        aria-label={`Actions pour ${quote.number}`}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={show({ quote: quote.uuid })}>
                            Voir le devis
                        </Link>
                    </DropdownMenuItem>
                    {quote.invoice && (
                        <DropdownMenuItem asChild>
                            <Link
                                href={invoiceShow({
                                    invoice: quote.invoice.uuid,
                                })}
                            >
                                Voir la facture {quote.invoice.number}
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onClick={() =>
                            downloadQuotePdf(quote.uuid, quote.number)
                        }
                    >
                        Télécharger le PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() =>
                            navigator.clipboard.writeText(quote.number)
                        }
                    >
                        Copier le numéro
                    </DropdownMenuItem>
                    {canManage && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                disabled={!quote.can_send}
                                onClick={() => setSending(true)}
                            >
                                Envoyer au client
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!quote.can_accept}
                                onClick={() =>
                                    post(accept({ quote: quote.uuid }).url)
                                }
                            >
                                Marquer accepté
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!quote.can_decline}
                                onClick={() => setDeclining(true)}
                            >
                                Marquer refusé
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!quote.can_invoice}
                                onClick={() =>
                                    post(invoice({ quote: quote.uuid }).url)
                                }
                            >
                                Créer la facture
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

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
