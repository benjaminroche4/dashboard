import { Head, usePage } from '@inertiajs/react';
import { Building2, Plus, Upload, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { FilterMenu } from '@/components/filter-menu';
import { OwnerBulkActions } from '@/components/owners/owner-bulk-actions';
import { ownerColumnLabels, ownerColumns } from '@/components/owners/columns';
import { OwnerDialog } from '@/components/owners/owner-dialog';
import { OwnerImportDialog } from '@/components/owners/owner-import-dialog';
import { Button } from '@/components/ui/button';
import {
    useServerTable,
    type ServerPagination,
    type ServerTableFilters,
} from '@/hooks/use-server-table';
import { index as ownersIndex } from '@/routes/owners';
import type { Owner, OwnerKind, OwnerKindOption } from '@/types';

type Props = {
    /** Page courante de l'annuaire, paginée côté serveur. */
    owners: Owner[];
    kinds: OwnerKindOption[];
    pagination: ServerPagination;
    filters: ServerTableFilters;
    /** Comptes sur tout l'annuaire, pas seulement la page affichée. */
    kindCounts: Partial<Record<OwnerKind, number>>;
    holdingCounts: { with: number; without: number };
    propertiesCount: number;
};

/** Un propriétaire détient des biens, ou pas encore : le second filtre du menu. */
const HOLDING_OPTIONS = [
    { value: 'with', label: 'Avec au moins un bien' },
    { value: 'without', label: 'Sans bien rattaché' },
];

/** Un filtre absent de l'URL revient en chaîne vide, pas en tableau. */
function asList(value: string | string[] | null | undefined): string[] {
    return Array.isArray(value) ? value : [];
}

/**
 * Annuaire des propriétaires : notre base de données de qui possède quoi.
 * La prospection, elle, vit dans « Leads › Propriétaires ».
 */
export default function OwnersIndex({
    owners,
    kinds,
    pagination,
    filters,
    kindCounts,
    holdingCounts,
    propertiesCount,
}: Props) {
    const { auth } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editing, setEditing] = useState<Owner | null>(null);

    const add = () => {
        setEditing(null);
        setDialogOpen(true);
    };
    const edit = (owner: Owner) => {
        setEditing(owner);
        setDialogOpen(true);
    };
    const columns = useMemo(() => ownerColumns(edit), []);
    const server = useServerTable({
        url: ownersIndex().url,
        pagination,
        filters,
        only: [
            'owners',
            'pagination',
            'filters',
            'kindCounts',
            'holdingCounts',
            'propertiesCount',
        ],
    });

    return (
        <>
            <Head title="Propriétaires" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Propriétaires</h1>
                        <p className="text-muted-foreground text-sm">
                            {pagination.total} propriétaire(s) ·{' '}
                            {propertiesCount} bien(s) rattaché(s)
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setImportOpen(true)}
                        >
                            <Upload />
                            Importer
                        </Button>
                        <Button onClick={add}>
                            <Plus />
                            Nouveau propriétaire
                        </Button>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={owners}
                    server={server}
                    filterColumn="name"
                    filterPlaceholder="Rechercher un propriétaire (nom, société, ville)…"
                    columnLabels={ownerColumnLabels}
                    frame="panel"
                    actions={
                        <FilterMenu
                            groups={[
                                {
                                    title: 'Type',
                                    options: kinds.map((kind) => ({
                                        value: kind.value,
                                        label: kind.label,
                                        icon:
                                            kind.value === 'company' ? (
                                                <Building2 />
                                            ) : (
                                                <UserRound />
                                            ),
                                    })),
                                    counts: kindCounts,
                                    value: asList(filters.kind),
                                    onChange: (value) =>
                                        server.setFilter('kind', value),
                                },
                                {
                                    title: 'Biens',
                                    options: HOLDING_OPTIONS,
                                    counts: holdingCounts,
                                    value: asList(filters.holding),
                                    onChange: (value) =>
                                        server.setFilter('holding', value),
                                },
                            ]}
                        />
                    }
                    bulkActions={(rows, clear) => (
                        <OwnerBulkActions
                            owners={rows}
                            onDone={clear}
                            canDelete={auth.user.role === 'admin'}
                        />
                    )}
                />
            </div>
            <OwnerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                kinds={kinds}
                owner={editing}
            />
            <OwnerImportDialog open={importOpen} onOpenChange={setImportOpen} />
        </>
    );
}

OwnersIndex.layout = {
    breadcrumbs: [{ title: 'Propriétaires', href: ownersIndex() }],
};
