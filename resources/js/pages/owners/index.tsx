import { Head } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { ownerColumnLabels, ownerColumns } from '@/components/owners/columns';
import { OwnerDialog } from '@/components/owners/owner-dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { index as ownersIndex } from '@/routes/owners';
import type { Owner, OwnerStatus, OwnerStatusOption } from '@/types';

type Props = {
    owners: Owner[];
    statuses: OwnerStatusOption[];
};

export default function OwnersIndex({ owners, statuses }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Owner | null>(null);
    const [statusFilter, setStatusFilter] = useState<OwnerStatus | ''>('');

    const add = () => {
        setEditing(null);
        setDialogOpen(true);
    };
    const edit = (owner: Owner) => {
        setEditing(owner);
        setDialogOpen(true);
    };
    const columns = useMemo(() => ownerColumns(edit), []);
    const counts = useMemo(
        () =>
            owners.reduce<Partial<Record<OwnerStatus, number>>>(
                (acc, owner) => ({
                    ...acc,
                    [owner.status]: (acc[owner.status] ?? 0) + 1,
                }),
                {},
            ),
        [owners],
    );
    const visible = statusFilter
        ? owners.filter((owner) => owner.status === statusFilter)
        : owners;
    const toContact = counts.to_contact ?? 0;

    return (
        <>
            <Head title="Propriétaires à contacter" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            Propriétaires à contacter
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {owners.length} propriétaire(s)
                            {toContact > 0 && ` · ${toContact} à contacter`}
                        </p>
                    </div>
                    <Button onClick={add}>
                        <Plus />
                        Nouveau propriétaire
                    </Button>
                </div>
                <ToggleGroup
                    type="single"
                    value={statusFilter || 'all'}
                    onValueChange={(value) =>
                        value &&
                        setStatusFilter(
                            value === 'all' ? '' : (value as OwnerStatus),
                        )
                    }
                    aria-label="Filtrer par statut"
                    className="mb-4 flex-wrap justify-start gap-1"
                >
                    <ToggleGroupItem
                        value="all"
                        className="h-8 rounded-md px-3 text-xs first:rounded-md last:rounded-md"
                    >
                        Tous
                        <span className="text-muted-foreground tabular-nums">
                            {owners.length}
                        </span>
                    </ToggleGroupItem>
                    {statuses.map((status) => (
                        <ToggleGroupItem
                            key={status.value}
                            value={status.value}
                            className="h-8 rounded-md px-3 text-xs first:rounded-md last:rounded-md"
                        >
                            {status.label}
                            <span className="text-muted-foreground tabular-nums">
                                {counts[status.value] ?? 0}
                            </span>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                <DataTable
                    columns={columns}
                    data={visible}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par nom…"
                    columnLabels={ownerColumnLabels}
                    frame="panel"
                />
            </div>
            <OwnerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                statuses={statuses}
                owner={editing}
                defaultStatus={statusFilter}
            />
        </>
    );
}

OwnersIndex.layout = {
    breadcrumbs: [
        { title: 'Propriétaires', href: ownersIndex() },
        { title: 'À contacter', href: ownersIndex() },
    ],
};
