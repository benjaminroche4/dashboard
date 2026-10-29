import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { InvoiceRowActions } from '@/components/invoices/invoice-row-actions';
import { invoiceStatusClasses } from '@/components/invoices/invoice-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate, formatMoney } from '@/lib/format';
import { show as invoiceShow } from '@/routes/invoices';
import type { Invoice } from '@/types';

export const invoiceColumnLabels: Record<string, string> = {
    number: 'Numéro',
    client_name: 'Client',
    status: 'Statut',
    amount_cents: 'Montant',
    issued_at: 'Émise le',
    due_at: 'Échéance',
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

/** Colonnes de la liste ; `canManage` ouvre « Modifier » dans le menu « ⋯ ». */
export function invoiceColumns(canManage = false): ColumnDef<Invoice>[] {
    return [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Tout sélectionner"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label={`Sélectionner ${row.original.number}`}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
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
                    href={invoiceShow({ invoice: row.original.uuid })}
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
                <Badge
                    variant="secondary"
                    data-status={row.original.status}
                    className={invoiceStatusClasses[row.original.status]}
                >
                    {row.original.status_label}
                </Badge>
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
                    label="Émise le"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => formatDate(row.getValue('issued_at')),
        },
        {
            accessorKey: 'due_at',
            header: 'Échéance',
            cell: ({ row }) => formatDate(row.getValue('due_at')),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => (
                <InvoiceRowActions
                    invoice={row.original}
                    canManage={canManage}
                />
            ),
        },
    ];
}
