import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { OwnerRowActions } from '@/components/owners/owner-row-actions';
import { OwnerStatusBadge } from '@/components/owners/owner-status-badge';
import { formatAddress } from '@/components/real-estate/columns';
import { Button } from '@/components/ui/button';
import { show as leadShow } from '@/routes/leads';
import type { Owner } from '@/types';

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

export const ownerColumnLabels: Record<string, string> = {
    name: 'Propriétaire',
    status_label: 'Statut',
    contact: 'Contact',
    address: 'Bien',
    last_contacted_at: 'Dernier contact',
    creator: 'Ajouté par',
};

export function ownerColumns(
    onEdit: (owner: Owner) => void,
): ColumnDef<Owner>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader
                    label="Propriétaire"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div className="grid">
                    <button
                        type="button"
                        onClick={() => onEdit(row.original)}
                        className="text-left font-medium hover:underline"
                    >
                        {row.original.name}
                    </button>
                    {row.original.company && (
                        <span className="text-muted-foreground truncate text-xs">
                            {row.original.company}
                        </span>
                    )}
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
                <div className="grid justify-items-start gap-1">
                    <OwnerStatusBadge
                        status={row.original.status}
                        label={row.original.status_label}
                    />
                    {row.original.lead && (
                        <Link
                            href={leadShow({ lead: row.original.lead.uuid })}
                            className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                        >
                            Lead {row.original.lead.reference} ·{' '}
                            {row.original.lead.status_label}
                        </Link>
                    )}
                </div>
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
            id: 'address',
            header: 'Bien',
            cell: ({ row }) => (
                <div className="grid text-sm">
                    <span className="text-muted-foreground">
                        {formatAddress(row.original) ?? '—'}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                        {row.original.property_count} bien(s)
                    </span>
                </div>
            ),
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
                        ? dateFormat.format(
                              new Date(row.original.last_contacted_at),
                          )
                        : 'Jamais'}
                </span>
            ),
        },
        {
            id: 'creator',
            accessorFn: (owner) => owner.creator ?? '',
            header: 'Ajouté par',
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm">
                    <CreatedBy
                        name={row.original.creator}
                        avatar={row.original.creator_avatar}
                        verb=""
                    />
                </span>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => (
                <div className="text-right">
                    <OwnerRowActions
                        owner={row.original}
                        onEdit={() => onEdit(row.original)}
                    />
                </div>
            ),
        },
    ];
}
