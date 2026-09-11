import { Head, Link, usePage } from '@inertiajs/react';
import { Home, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table';
import { FilterMenu } from '@/components/filter-menu';
import {
    propertyColumnLabels,
    propertyColumns,
} from '@/components/properties/columns';
import { PropertyBulkActions } from '@/components/properties/property-bulk-actions';
import { PropertiesMapButton } from '@/components/properties/properties-map-dialog';
import { Button } from '@/components/ui/button';
import {
    useServerTable,
    type ServerPagination,
    type ServerTableFilters,
} from '@/hooks/use-server-table';
import {
    create as propertyCreate,
    index as propertiesIndex,
} from '@/routes/properties';
import type { Property, PropertyFormOptions, PropertyStatus } from '@/types';

type Props = PropertyFormOptions & {
    properties: Property[];
    pagination: ServerPagination;
    filters: ServerTableFilters & { status: PropertyStatus[] };
    /** Comptés sur tout l'annuaire, pas seulement la page affichée. */
    visitedCount: number;
    statusCounts: Partial<Record<PropertyStatus, number>>;
};

export default function PropertiesIndex({
    properties,
    propertyStatuses,
    pagination,
    filters,
    visitedCount,
    statusCounts,
}: Props) {
    const { auth } = usePage().props;
    const canDelete = auth.user.role === 'admin';
    const columns = useMemo(() => propertyColumns(canDelete), [canDelete]);
    // L'annuaire peut compter des milliers de biens : recherche, filtre, tri et
    // pagination se font côté serveur.
    const server = useServerTable({
        url: propertiesIndex().url,
        pagination,
        filters,
        only: [
            'properties',
            'pagination',
            'filters',
            'visitedCount',
            'statusCounts',
        ],
    });

    return (
        <>
            <Head title="Biens" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Biens</h1>
                        <p className="text-muted-foreground text-sm">
                            {pagination.total} bien(s)
                            {visitedCount > 0 &&
                                ` · ${visitedCount} déjà visité(s)`}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* La carte charge les biens elle-même, à l'ouverture. */}
                        <PropertiesMapButton />
                        <Button asChild>
                            <Link href={propertyCreate()}>
                                <Plus />
                                Nouveau bien
                            </Link>
                        </Button>
                    </div>
                </div>
                {pagination.total === 0 && filters.q === '' ? (
                    <section
                        aria-label="Aucun bien"
                        className="bg-sidebar text-muted-foreground grid place-items-center gap-2 rounded-xl border px-4 py-16 text-center text-sm"
                    >
                        <Home className="size-6" aria-hidden />
                        <p className="text-foreground font-medium">
                            Aucun bien dans l’annuaire pour le moment
                        </p>
                        <p className="max-w-md text-pretty">
                            Ajoutez un bien : il apparaîtra ici dans le tableau,
                            prêt à être proposé et visité.
                        </p>
                    </section>
                ) : (
                    <DataTable
                        columns={columns}
                        data={properties}
                        server={server}
                        filterPlaceholder="Rechercher un bien ou une adresse…"
                        columnLabels={propertyColumnLabels}
                        frame="panel"
                        actions={
                            <FilterMenu
                                title="Disponibilité"
                                options={propertyStatuses}
                                counts={statusCounts}
                                value={filters.status}
                                onChange={(status) =>
                                    server.setFilter('status', status)
                                }
                            />
                        }
                        bulkActions={
                            canDelete
                                ? (rows, clear) => (
                                      <PropertyBulkActions
                                          properties={rows}
                                          onDone={clear}
                                      />
                                  )
                                : undefined
                        }
                    />
                )}
            </div>
        </>
    );
}

PropertiesIndex.layout = {
    breadcrumbs: [
        { title: 'Réseau', href: propertiesIndex() },
        { title: 'Biens', href: propertiesIndex() },
    ],
};
