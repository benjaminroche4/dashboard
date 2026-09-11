import { Head, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { DirectoryBulkActions } from '@/components/real-estate/directory-bulk-actions';
import { FavoritesFilter } from '@/components/favorites-filter';
import {
    partnerColumnLabels,
    partnerColumns,
} from '@/components/partners/columns';
import { PartnerDialog } from '@/components/partners/partner-dialog';
import { PartnerTypeFilter } from '@/components/partners/partner-type-filter';
import { Button } from '@/components/ui/button';
import { bulkDestroy, index as partnersIndex } from '@/routes/partners';
import type { Partner, PartnerType, PartnerTypeOption } from '@/types';

type Props = {
    partners: Partner[];
    types: PartnerTypeOption[];
    /** Nombre de partenaires étoilés par le membre connecté. */
    favoritesCount: number;
};

export default function PartnersIndex({
    partners,
    types,
    favoritesCount,
}: Props) {
    const { auth } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Partner | null>(null);
    const [typeFilter, setTypeFilter] = useState<PartnerType[]>([]);
    const [favoritesOnly, setFavoritesOnly] = useState(false);

    const add = () => {
        setEditing(null);
        setDialogOpen(true);
    };
    const edit = (partner: Partner) => {
        setEditing(partner);
        setDialogOpen(true);
    };
    const columns = useMemo(() => partnerColumns(edit), []);
    const counts = useMemo(
        () =>
            partners.reduce<Partial<Record<PartnerType, number>>>(
                (acc, partner) => ({
                    ...acc,
                    [partner.type]: (acc[partner.type] ?? 0) + 1,
                }),
                {},
            ),
        [partners],
    );
    const visible = partners
        .filter(
            (partner) =>
                typeFilter.length === 0 || typeFilter.includes(partner.type),
        )
        .filter((partner) => !favoritesOnly || partner.is_favorite);

    return (
        <>
            <Head title="Partenaires" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Partenaires</h1>
                        <p className="text-muted-foreground text-sm">
                            {partners.length} partenaire(s)
                        </p>
                    </div>
                    <Button onClick={add}>
                        <Plus />
                        Nouveau partenaire
                    </Button>
                </div>
                <div className="mb-4 flex items-center gap-2">
                    <PartnerTypeFilter
                        types={types}
                        counts={counts}
                        value={typeFilter}
                        onChange={setTypeFilter}
                    />
                    <FavoritesFilter
                        active={favoritesOnly}
                        onChange={setFavoritesOnly}
                        count={favoritesCount}
                    />
                </div>
                <DataTable
                    columns={columns}
                    data={visible}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par nom…"
                    columnLabels={partnerColumnLabels}
                    frame="panel"
                    bulkActions={(rows, clear) => (
                        <DirectoryBulkActions
                            ids={rows.map((row) => row.id)}
                            url={bulkDestroy().url}
                            title={`Supprimer ${rows.length} partenaire(s) ?`}
                            description="Leurs fiches et leurs interlocuteurs seront effacés. Les dossiers sur lesquels ils sont intervenus sont conservés. Cette action est irréversible."
                            onDone={clear}
                            canDelete={auth.user.role === 'admin'}
                        />
                    )}
                />
            </div>
            <PartnerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                types={types}
                partner={editing}
                // Un seul type filtré : il est présélectionné dans le formulaire d'ajout.
                defaultType={typeFilter.length === 1 ? typeFilter[0] : ''}
            />
        </>
    );
}

PartnersIndex.layout = {
    breadcrumbs: [{ title: 'Partenaires', href: partnersIndex() }],
};
