import { Head } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { FavoritesFilter } from '@/components/favorites-filter';
import { AgencyDialog } from '@/components/real-estate/agency-dialog';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import {
    agencyColumnLabels,
    agencyColumns,
} from '@/components/real-estate/columns';
import { Button } from '@/components/ui/button';
import { index as agenciesIndex } from '@/routes/agencies';
import { index as agentsIndex } from '@/routes/agents';
import type { Agency } from '@/types';

type Props = {
    agencies: Agency[];
};

export default function Agencies({ agencies }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Agency | null>(null);
    // Ajout d'un agent depuis la liste des agents d'une agence, agence présélectionnée.
    const [agentDialogOpen, setAgentDialogOpen] = useState(false);
    const [agentAgency, setAgentAgency] = useState<Agency | null>(null);
    const agencyOptions = useMemo(
        () =>
            agencies.map((agency) => ({
                id: agency.id,
                uuid: agency.uuid,
                name: agency.name,
            })),
        [agencies],
    );
    const addAgent = (agency: Agency) => {
        setAgentAgency(agency);
        setAgentDialogOpen(true);
    };

    const add = () => {
        setEditing(null);
        setDialogOpen(true);
    };
    const edit = (agency: Agency) => {
        setEditing(agency);
        setDialogOpen(true);
    };
    const columns = useMemo(() => agencyColumns(edit, addAgent), []);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const favoritesCount = agencies.filter(
        (agency) => agency.is_favorite,
    ).length;
    const rows = useMemo(
        () =>
            favoritesOnly
                ? agencies.filter((agency) => agency.is_favorite)
                : agencies,
        [agencies, favoritesOnly],
    );

    return (
        <>
            <Head title="Agences immobilières" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Agences</h1>
                        <p className="text-muted-foreground text-sm">
                            {agencies.length} agence(s) partenaire(s)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <FavoritesFilter
                            active={favoritesOnly}
                            onChange={setFavoritesOnly}
                            count={favoritesCount}
                        />
                        <Button onClick={add}>
                            <Plus />
                            Nouvelle agence
                        </Button>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={rows}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par agence…"
                    columnLabels={agencyColumnLabels}
                    frame="panel"
                />
            </div>
            <AgencyDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                agency={editing}
            />
            <AgentDialog
                open={agentDialogOpen}
                onOpenChange={setAgentDialogOpen}
                agencies={agencyOptions}
                defaultAgencyId={agentAgency?.id ?? null}
            />
        </>
    );
}

Agencies.layout = {
    breadcrumbs: [
        { title: 'Agents immobiliers', href: agentsIndex() },
        { title: 'Agences', href: agenciesIndex() },
    ],
};
