import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { PropertyRowActions } from '@/components/properties/property-row-actions';
import { formatAddress } from '@/components/real-estate/columns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { show as agentShow } from '@/routes/agents';
import { show as propertyShow } from '@/routes/properties';
import type { Property } from '@/types';

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

export const propertyColumnLabels: Record<string, string> = {
    label: 'Bien',
    features: 'Caractéristiques',
    rent_cents: 'Loyer',
    agent: 'Agent',
    visits_count: 'Visites',
    creator: 'Ajouté par',
};

/** Résumé « T2 · Meublé · 42 m² · 2 pièces » d'un bien. */
export function propertyFeatures(property: Property): string {
    return [
        property.property_type_label,
        property.furnished_label,
        property.surface_m2 ? `${property.surface_m2} m²` : null,
        property.rooms ? `${property.rooms} pièce(s)` : null,
    ]
        .filter(Boolean)
        .join(' · ');
}

export function propertyColumns(): ColumnDef<Property>[] {
    return [
        {
            accessorKey: 'label',
            header: ({ column }) => (
                <SortableHeader
                    label="Bien"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div className="grid">
                    <Link
                        href={propertyShow({ property: row.original.uuid })}
                        className="font-medium underline-offset-4 hover:underline"
                    >
                        {row.original.label}
                    </Link>
                    <span className="text-muted-foreground truncate text-xs">
                        {formatAddress(row.original) ?? '—'}
                        {row.original.district &&
                            ` · ${row.original.district}e`}
                    </span>
                </div>
            ),
        },
        {
            id: 'features',
            header: 'Caractéristiques',
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm">
                    {propertyFeatures(row.original) || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'rent_cents',
            header: ({ column }) => (
                <SortableHeader
                    label="Loyer"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) =>
                row.original.rent_cents === null ? (
                    <span className="text-muted-foreground">—</span>
                ) : (
                    <span className="text-sm tabular-nums">
                        {formatMoney(
                            row.original.rent_cents,
                            row.original.currency,
                        )}
                        <span className="text-muted-foreground"> / mois</span>
                    </span>
                ),
        },
        {
            id: 'agent',
            accessorFn: (property) => property.agent?.name ?? '',
            header: 'Agent',
            cell: ({ row }) =>
                row.original.agent ? (
                    <div className="grid text-sm">
                        <Link
                            href={agentShow({ agent: row.original.agent.uuid })}
                            className="font-medium underline-offset-4 hover:underline"
                        >
                            {row.original.agent.name}
                        </Link>
                        {row.original.agent.agency && (
                            <span className="text-muted-foreground text-xs">
                                {row.original.agent.agency}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            accessorKey: 'visits_count',
            header: ({ column }) => (
                <SortableHeader
                    label="Visites"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums">
                        {row.original.visits_count}
                    </Badge>
                    {row.original.listing_url && (
                        <a
                            href={row.original.listing_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Annonce de ${row.original.label}`}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                    )}
                </div>
            ),
        },
        {
            id: 'creator',
            accessorFn: (property) => property.creator ?? '',
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
                    <PropertyRowActions property={row.original} />
                </div>
            ),
        },
    ];
}
