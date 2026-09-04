import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { LeadStatusMenu } from '@/components/leads/lead-status-menu';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/lib/format';
import type { Lead, LeadStatusOption } from '@/types';

export const leadColumnLabels: Record<string, string> = {
    name: 'Lead',
    offer_label: 'Offre',
    arrival_at: 'Arrivée',
    budget_cents: 'Budget',
    source_label: 'Source',
    status: 'Statut',
    created_at: 'Ajouté le',
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

/** Colonnes de la liste des leads ; le statut se change depuis son badge. */
export function leadColumns(statuses: LeadStatusOption[]): ColumnDef<Lead>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader
                    label="Lead"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.name}</div>
                    <div className="text-muted-foreground text-xs">
                        {[row.original.email, row.original.phone]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'offer_label',
            header: 'Offre',
            cell: ({ row }) => row.original.offer_label ?? '—',
        },
        {
            accessorKey: 'arrival_at',
            header: ({ column }) => (
                <SortableHeader
                    label="Arrivée"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) =>
                row.original.arrival_at
                    ? formatDate(row.original.arrival_at)
                    : '—',
        },
        {
            accessorKey: 'budget_cents',
            header: ({ column }) => (
                <div className="text-right">
                    <SortableHeader
                        label="Budget"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-right tabular-nums">
                    {row.original.budget_cents === null
                        ? '—'
                        : formatMoney(
                              row.original.budget_cents,
                              row.original.currency,
                          )}
                </div>
            ),
        },
        {
            accessorKey: 'source_label',
            header: 'Source',
        },
        {
            accessorKey: 'status',
            header: 'Statut',
            cell: ({ row }) => (
                <LeadStatusMenu lead={row.original} statuses={statuses} />
            ),
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <SortableHeader
                    label="Ajouté le"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) =>
                row.original.created_at
                    ? formatDate(row.original.created_at.slice(0, 10))
                    : '—',
        },
    ];
}
