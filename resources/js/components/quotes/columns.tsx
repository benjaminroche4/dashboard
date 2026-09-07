import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { QuoteRowActions } from '@/components/quotes/quote-row-actions';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/lib/format';
import { show as quoteShow } from '@/routes/tools/quotes';
import type { Quote } from '@/types';

export const quoteColumnLabels: Record<string, string> = {
    number: 'Numéro',
    client_name: 'Client',
    status: 'Statut',
    amount_cents: 'Montant',
    issued_at: 'Émis le',
    valid_until: 'Valide jusqu’au',
};

function SortableHeader({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <Button variant="ghost" onClick={onClick} className="-ml-3">
            {label}
            <ArrowUpDown />
        </Button>
    );
}

/** Colonnes de la liste ; `canManage` masque les actions de statut aux membres. */
export function quoteColumns(canManage: boolean): ColumnDef<Quote>[] {
    return [
        {
            accessorKey: 'number',
            header: ({ column }) => (
                <SortableHeader
                    label="Numéro"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <Link
                    href={quoteShow({ quote: row.original.uuid })}
                    className="font-medium hover:underline"
                >
                    {row.getValue('number')}
                </Link>
            ),
        },
        {
            accessorKey: 'client_name',
            header: ({ column }) => (
                <SortableHeader
                    label="Client"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div>
                    <div>{row.getValue('client_name')}</div>
                    {row.original.client_email && (
                        <div className="text-muted-foreground text-xs">
                            {row.original.client_email}
                        </div>
                    )}
                    {row.original.lead && (
                        <div className="text-muted-foreground text-xs">
                            Lead : {row.original.lead.name}
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Statut',
            cell: ({ row }) => (
                <div className="grid justify-items-start gap-1">
                    <QuoteStatusBadge
                        status={row.original.status}
                        label={row.original.status_label}
                    />
                    {row.original.invoice && (
                        <span className="text-muted-foreground text-xs">
                            Facture {row.original.invoice.number}
                        </span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'amount_cents',
            header: ({ column }) => (
                <div className="text-right">
                    <SortableHeader
                        label="Montant"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-right font-medium tabular-nums">
                    {formatMoney(
                        row.original.amount_cents,
                        row.original.currency,
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'issued_at',
            header: ({ column }) => (
                <SortableHeader
                    label="Émis le"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => formatDate(row.getValue('issued_at')),
        },
        {
            accessorKey: 'valid_until',
            header: 'Valide jusqu’au',
            cell: ({ row }) => formatDate(row.getValue('valid_until')),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => (
                <QuoteRowActions quote={row.original} canManage={canManage} />
            ),
        },
    ];
}
