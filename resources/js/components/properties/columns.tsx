import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Building2, ExternalLink, UserRound } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { PropertyRowActions } from '@/components/properties/property-row-actions';
import { PropertyAssignmentBadge } from '@/components/properties/property-assignment';
import { PropertyStatusBadge } from '@/components/properties/property-status-badge';
import { PropertyThumb } from '@/components/visits/property-picker';
import { formatAddress } from '@/components/real-estate/columns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    select: 'Sélection',
    status_label: 'Statut',
    label: 'Bien',
    features: 'Caractéristiques',
    rent_cents: 'Loyer',
    origin: 'Provenance',
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

export function propertyColumns(
    /** Admins seulement : la case à cocher ouvre la suppression groupée. */
    canSelect = false,
): ColumnDef<Property>[] {
    return [
        ...(canSelect
            ? ([
                  {
                      id: 'select',
                      header: ({ table }) => (
                          <Checkbox
                              checked={
                                  table.getIsAllPageRowsSelected() ||
                                  (table.getIsSomePageRowsSelected() &&
                                      'indeterminate')
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
                              onCheckedChange={(value) =>
                                  row.toggleSelected(!!value)
                              }
                              aria-label={`Sélectionner ${row.original.label}`}
                          />
                      ),
                      enableSorting: false,
                      enableHiding: false,
                  },
              ] as ColumnDef<Property>[])
            : []),
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
                // La photo précède le nom, silhouette de bâtiment à défaut.
                <div className="flex items-center gap-3">
                    <PropertyThumb
                        photo={row.original.photos[0]}
                        label={row.original.label}
                        className="size-10 shrink-0"
                    />
                    <div className="grid min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                            <Link
                                href={propertyShow({
                                    property: row.original.uuid,
                                })}
                                className="truncate font-medium underline-offset-4 hover:underline"
                            >
                                {row.original.label}
                            </Link>
                            {row.original.listing_url && (
                                <a
                                    href={row.original.listing_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Annonce de ${row.original.label}`}
                                    className="text-muted-foreground hover:text-foreground shrink-0"
                                >
                                    <ExternalLink
                                        className="size-3.5"
                                        aria-hidden
                                    />
                                </a>
                            )}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                            {formatAddress(row.original) ?? '—'}
                            {row.original.district &&
                                ` · ${row.original.district}e`}
                        </span>
                        {/* Bien pris : la pastille verte se voit avant tout le reste. */}
                        <PropertyAssignmentBadge
                            property={row.original}
                            className="mt-1 w-fit"
                        />
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'status_label',
            header: 'Statut',
            cell: ({ row }) => (
                <PropertyStatusBadge
                    status={row.original.status}
                    label={row.original.status_label}
                />
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
            id: 'origin',
            // Ce qui compte à la lecture : d'où vient le bien — d'une agence,
            // d'un agent indépendant, ou du propriétaire en direct.
            accessorFn: (property) =>
                property.agent?.agency ?? property.agent?.name ?? '',
            header: 'Provenance',
            cell: ({ row }) => {
                const agent = row.original.agent;

                if (!agent) {
                    return (
                        <div className="grid text-sm">
                            <span className="font-medium">En direct</span>
                            <span className="text-muted-foreground text-xs">
                                Sans agent
                            </span>
                        </div>
                    );
                }

                return (
                    <div className="grid text-sm">
                        <span className="flex items-center gap-1.5 font-medium">
                            {agent.agency ? (
                                <>
                                    <Building2
                                        className="text-muted-foreground size-3.5 shrink-0"
                                        aria-hidden
                                    />
                                    <span className="truncate">
                                        {agent.agency}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <UserRound
                                        className="text-muted-foreground size-3.5 shrink-0"
                                        aria-hidden
                                    />
                                    Indépendant
                                </>
                            )}
                        </span>
                        <Link
                            href={agentShow({ agent: agent.uuid })}
                            className="text-muted-foreground truncate text-xs underline-offset-4 hover:underline"
                        >
                            {agent.name}
                        </Link>
                    </div>
                );
            },
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
