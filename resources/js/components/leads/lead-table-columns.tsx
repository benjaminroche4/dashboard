import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { leadStatusClasses } from '@/components/leads/lead-status-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OfferBadge } from '@/components/clients/offer-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/lib/format';
import { show as leadShow } from '@/routes/leads';
import type { Lead } from '@/types';

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

const initials = (name: string) =>
    name
        .split(/\s+/)
        .map((part) => part[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

export const leadTableColumnLabels: Record<string, string> = {
    name: 'Lead',
    status_label: 'Statut',
    contact: 'Contact',
    offer_label: 'Formule',
    budget_cents: 'Budget',
    arrival_at: 'Arrivée',
    assignee: 'Suivi par',
    last_contacted_at: 'Dernier contact',
};

/** Vue tableau de la liste des leads, même présentation que les dossiers clients. */
export const leadTableColumns: ColumnDef<Lead>[] = [
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
            <div className="grid">
                <Link
                    href={leadShow({ lead: row.original.uuid })}
                    className="font-medium hover:underline"
                >
                    {row.original.name}
                </Link>
                <span className="text-muted-foreground truncate text-xs">
                    {row.original.company ?? row.original.reference ?? '—'}
                </span>
            </div>
        ),
    },
    {
        accessorKey: 'status_label',
        header: ({ column }) => (
            <SortableHeader
                label="Statut"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) => (
            <Badge
                variant="secondary"
                data-status={row.original.status}
                className={leadStatusClasses[row.original.status]}
            >
                {row.original.status_label}
            </Badge>
        ),
    },
    {
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => {
            const { email, phone } = row.original;

            if (!email && !phone) {
                return <span className="text-muted-foreground">—</span>;
            }

            return (
                <div className="grid text-sm">
                    {email && (
                        <a
                            href={`mailto:${email}`}
                            className="truncate underline-offset-4 hover:underline"
                        >
                            {email}
                        </a>
                    )}
                    {phone && (
                        <a
                            href={`tel:${phone.replace(/\s+/g, '')}`}
                            className="text-muted-foreground truncate underline-offset-4 hover:underline"
                        >
                            {phone}
                        </a>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: 'offer_label',
        header: 'Formule',
        cell: ({ row }) => (
            <OfferBadge
                offer={row.original.offer}
                label={row.original.offer_label}
            />
        ),
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
                {row.original.budget_cents === null ? (
                    <span className="text-muted-foreground">—</span>
                ) : (
                    formatMoney(
                        row.original.budget_cents,
                        row.original.currency,
                    )
                )}
            </div>
        ),
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
            row.original.arrival_at ? (
                formatDate(row.original.arrival_at)
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
    },
    {
        id: 'assignee',
        accessorFn: (lead) => lead.assignee?.name ?? '',
        header: 'Suivi par',
        cell: ({ row }) => {
            const assignee = row.original.assignee;

            if (!assignee) {
                return (
                    <span className="text-muted-foreground">Non attribué</span>
                );
            }

            return (
                <span className="flex items-center gap-2">
                    <Avatar className="size-6">
                        {assignee.avatar && (
                            <AvatarImage src={assignee.avatar} alt="" />
                        )}
                        <AvatarFallback className="text-[10px]">
                            {initials(assignee.name)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{assignee.name}</span>
                </span>
            );
        },
    },
    {
        accessorKey: 'last_contacted_at',
        header: ({ column }) => (
            <SortableHeader
                label="Dernier contact"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">
                {row.original.last_contacted_at
                    ? formatDate(row.original.last_contacted_at.slice(0, 10))
                    : 'Jamais'}
            </span>
        ),
    },
];
