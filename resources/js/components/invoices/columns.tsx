import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatMoney } from '@/lib/format';
import type { Invoice, InvoiceStatus } from '@/types';

export const invoiceColumnLabels: Record<string, string> = {
    number: 'Numéro',
    client_name: 'Client',
    status: 'Statut',
    amount_cents: 'Montant',
    issued_at: 'Émise le',
    due_at: 'Échéance',
};

const statusVariant: Record<
    InvoiceStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    paid: 'default',
    sent: 'secondary',
    overdue: 'destructive',
    draft: 'outline',
    cancelled: 'outline',
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

export const invoiceColumns: ColumnDef<Invoice>[] = [
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
            <span className="font-medium">{row.getValue('number')}</span>
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
            </div>
        ),
    },
    {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ row }) => (
            <Badge variant={statusVariant[row.original.status]}>
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
                {formatMoney(row.original.amount_cents, row.original.currency)}
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
        cell: ({ row }) => {
            const invoice = row.original;

            return (
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
                        <DropdownMenuItem
                            onClick={() =>
                                navigator.clipboard.writeText(invoice.number)
                            }
                        >
                            Copier le numéro
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                            Voir la facture
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                            Marquer comme payée
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
