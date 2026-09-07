import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { leadStatusClasses } from '@/components/leads/lead-status-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { show as leadShow } from '@/routes/leads';
import type { OwnerLead } from '@/types';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

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

export const ownerLeadColumnLabels: Record<string, string> = {
    name: 'Lead',
    status_label: 'Statut',
    contact: 'Contact',
    source_label: 'Source',
    assignee: 'Suivi par',
    created_at: 'Reçu le',
};

export const ownerLeadColumns: ColumnDef<OwnerLead>[] = [
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
                    {row.original.reference}
                    {row.original.company && ` · ${row.original.company}`}
                </span>
            </div>
        ),
    },
    {
        accessorKey: 'status_label',
        header: 'Statut',
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
                            className="text-muted-foreground truncate underline-offset-4 hover:underline"
                        >
                            {email}
                        </a>
                    )}
                    {phone && (
                        <a
                            href={`tel:${phone.replace(/\s+/g, '')}`}
                            className="text-muted-foreground underline-offset-4 hover:underline"
                        >
                            {phone}
                        </a>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: 'source_label',
        header: 'Source',
        cell: ({ row }) => (
            <div className="grid text-sm">
                <span>{row.original.source_label}</span>
                {row.original.source_note && (
                    <span className="text-muted-foreground truncate text-xs">
                        {row.original.source_note}
                    </span>
                )}
            </div>
        ),
    },
    {
        id: 'assignee',
        accessorFn: (lead) => lead.assignee ?? '',
        header: 'Suivi par',
        cell: ({ row }) =>
            row.original.assignee ? (
                <span className="text-muted-foreground text-sm">
                    <CreatedBy
                        name={row.original.assignee}
                        avatar={row.original.assignee_avatar}
                        verb=""
                    />
                </span>
            ) : (
                <span className="text-muted-foreground text-sm">
                    Non attribué
                </span>
            ),
    },
    {
        accessorKey: 'created_at',
        header: ({ column }) => (
            <SortableHeader
                label="Reçu le"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">
                {row.original.created_at
                    ? dateFormat.format(new Date(row.original.created_at))
                    : '—'}
            </span>
        ),
    },
];
