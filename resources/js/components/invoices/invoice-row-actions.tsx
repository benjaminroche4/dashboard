import { Link, router } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { MarkPaidDialog } from '@/components/invoices/mark-paid-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadInvoicePdf } from '@/lib/download-invoice-pdf';
import { edit, send, show } from '@/routes/invoices';
import type { Invoice } from '@/types';

/**
 * Menu « … » d'une ligne de la liste : voir, modifier (brouillon), PDF,
 * envoyer, marquer payée.
 */
export function InvoiceRowActions({
    invoice,
    canManage = false,
}: {
    invoice: Invoice;
    /** Managers et admins : les membres consultent seulement. */
    canManage?: boolean;
}) {
    const [paying, setPaying] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="size-8 p-0"
                        aria-label={`Actions pour ${invoice.number}`}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={show({ invoice: invoice.uuid })}>
                            Voir la facture
                        </Link>
                    </DropdownMenuItem>
                    {canManage && invoice.can_edit && (
                        <DropdownMenuItem asChild>
                            <Link href={edit({ invoice: invoice.uuid })}>
                                Modifier
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onClick={() =>
                            downloadInvoicePdf(invoice.uuid, invoice.number)
                        }
                    >
                        Télécharger le PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() =>
                            navigator.clipboard.writeText(invoice.number)
                        }
                    >
                        Copier le numéro
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={!invoice.can_send}
                        onClick={() =>
                            router.post(
                                send({ invoice: invoice.uuid }).url,
                                {},
                                { preserveScroll: true },
                            )
                        }
                    >
                        Envoyer au client
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={!invoice.can_pay}
                        onClick={() => setPaying(true)}
                    >
                        Marquer comme payée
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <MarkPaidDialog
                invoiceUuid={invoice.uuid}
                invoiceNumber={invoice.number}
                open={paying}
                onOpenChange={setPaying}
            />
        </>
    );
}
