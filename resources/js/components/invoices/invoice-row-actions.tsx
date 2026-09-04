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
import { pdf, send, show } from '@/routes/invoices';
import type { Invoice } from '@/types';

/**
 * Menu « … » d'une ligne de la liste : voir, PDF, envoyer, marquer payée.
 */
export function InvoiceRowActions({ invoice }: { invoice: Invoice }) {
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
                        <Link href={show({ invoice: invoice.id })}>
                            Voir la facture
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <a
                            href={pdf({ invoice: invoice.id }).url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Télécharger le PDF
                        </a>
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
                                send({ invoice: invoice.id }).url,
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
                invoiceId={invoice.id}
                invoiceNumber={invoice.number}
                open={paying}
                onOpenChange={setPaying}
            />
        </>
    );
}
