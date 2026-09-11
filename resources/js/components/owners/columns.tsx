import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { OwnerRowActions } from '@/components/owners/owner-row-actions';
import { formatAddress } from '@/components/real-estate/columns';
import { OwnerKindBadge } from '@/components/owners/owner-kind-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { show as ownerShow } from '@/routes/owners';
import type { Owner } from '@/types';

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
    kind_label: 'Type',
    contact: 'Contact',
    address: 'Adresse',
    properties_count: 'Biens',
    last_contacted_at: 'Dernier échange',
    creator: 'Ajouté par',
};

const exchangeDate = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

export function ownerColumns(
    onEdit: (owner: Owner) => void,
): ColumnDef<Owner>[] {
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
                    aria-label={`Sélectionner ${row.original.name}`}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
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
                    <Link
                        href={ownerShow({ owner: row.original.uuid })}
                        className="font-medium underline-offset-4 hover:underline"
                    >
                        {row.original.name}
                    </Link>
                    {row.original.contact_name && (
                        <span className="text-muted-foreground truncate text-xs">
                            {row.original.contact_name}
                        </span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'kind_label',
            header: 'Type',
            cell: ({ row }) => (
                <OwnerKindBadge
                    kind={row.original.kind}
                    label={row.original.kind_label}
                />
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
            header: 'Adresse',
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm">
                    {formatAddress(row.original) ?? '—'}
                </span>
            ),
        },
        {
            accessorKey: 'properties_count',
            header: ({ column }) => (
                <div className="text-right">
                    <SortableHeader
                        label="Biens"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-right tabular-nums">
                    <Link
                        href={ownerShow({ owner: row.original.uuid })}
                        className="underline-offset-4 hover:underline"
                    >
                        {row.original.properties_count}
                    </Link>
                </div>
            ),
        },
        {
            accessorKey: 'last_contacted_at',
            header: ({ column }) => (
                <SortableHeader
                    label="Dernier échange"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm tabular-nums">
                    {row.original.last_contacted_at
                        ? exchangeDate.format(
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
