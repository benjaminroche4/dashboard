import { Head } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import {
    partnerColumnLabels,
    partnerColumns,
} from '@/components/partners/columns';
import { PartnerDialog } from '@/components/partners/partner-dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { partnerTypeIcons } from '@/lib/partner-type-icons';
import { index as partnersIndex } from '@/routes/partners';
import type { Partner, PartnerType, PartnerTypeOption } from '@/types';

type Props = {
    partners: Partner[];
    types: PartnerTypeOption[];
};

export default function PartnersIndex({ partners, types }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Partner | null>(null);
    const [typeFilter, setTypeFilter] = useState<PartnerType | ''>('');

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
    const visible = typeFilter
        ? partners.filter((partner) => partner.type === typeFilter)
        : partners;

    return (
        <>
            <Head title="Partenaires" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between pt-8 pb-6">
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
                <ToggleGroup
                    type="single"
                    value={typeFilter || 'all'}
                    onValueChange={(value) =>
                        value &&
                        setTypeFilter(
                            value === 'all' ? '' : (value as PartnerType),
                        )
                    }
                    aria-label="Filtrer par type"
                    className="mb-4 flex-wrap justify-start gap-1"
                >
                    <ToggleGroupItem
                        value="all"
                        className="h-8 rounded-md px-3 text-xs first:rounded-md last:rounded-md"
                    >
                        Tous
                        <span className="text-muted-foreground tabular-nums">
                            {partners.length}
                        </span>
                    </ToggleGroupItem>
                    {types.map((type) => {
                        const Icon = partnerTypeIcons[type.value];

                        return (
                            <ToggleGroupItem
                                key={type.value}
                                value={type.value}
                                className="h-8 rounded-md px-3 text-xs first:rounded-md last:rounded-md"
                            >
                                <Icon className="size-3.5" aria-hidden />
                                {type.label}
                                <span className="text-muted-foreground tabular-nums">
                                    {counts[type.value] ?? 0}
                                </span>
                            </ToggleGroupItem>
                        );
                    })}
                </ToggleGroup>
                <DataTable
                    columns={columns}
                    data={visible}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par nom…"
                    columnLabels={partnerColumnLabels}
                    frame="panel"
                />
            </div>
            <PartnerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                types={types}
                partner={editing}
                defaultType={typeFilter}
            />
        </>
    );
}

PartnersIndex.layout = {
    breadcrumbs: [{ title: 'Partenaires', href: partnersIndex() }],
};
