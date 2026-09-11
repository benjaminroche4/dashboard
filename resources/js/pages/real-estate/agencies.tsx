import { Head, usePage } from '@inertiajs/react';
import { Plus, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { DirectoryBulkActions } from '@/components/real-estate/directory-bulk-actions';
import { FavoritesFilter } from '@/components/favorites-filter';
import { AgencyDialog } from '@/components/real-estate/agency-dialog';
import { AgencyImportDialog } from '@/components/real-estate/agency-import-dialog';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import {
    agencyColumnLabels,
    agencyColumns,
} from '@/components/real-estate/columns';
import { Button } from '@/components/ui/button';
import {
    useServerTable,
    type ServerPagination,
    type ServerTableFilters,
} from '@/hooks/use-server-table';
import { bulkDestroy, index as agenciesIndex } from '@/routes/agencies';
import { index as agentsIndex } from '@/routes/agents';
import type { Agency, AgencyOption } from '@/types';

type Props = {
    /** Page courante de l'annuaire (50 agences), paginée côté serveur. */
    agencies: Agency[];
    /** Toutes les agences, pour le sélecteur du dialogue d'un agent. */
    agencyOptions?: AgencyOption[];
    pagination: ServerPagination;
    filters: ServerTableFilters;
    /** Nombre total de favoris du membre, toutes pages confondues. */
    favoritesCount: number;
};

export default function Agencies({
    agencies,
    agencyOptions: allAgencies,
    pagination,
    filters,
    favoritesCount,
}: Props) {
    const { auth } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Agency | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    // Ajout d'un agent depuis la liste des agents d'une agence, agence présélectionnée.
    const [agentDialogOpen, setAgentDialogOpen] = useState(false);
    const [agentAgency, setAgentAgency] = useState<Agency | null>(null);
    const agencyOptions = useMemo(
        () =>
            allAgencies ??
            agencies.map((agency) => ({
                id: agency.id,
                uuid: agency.uuid,
                name: agency.name,
            })),
        [agencies, allAgencies],
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
    const server = useServerTable({
        url: agenciesIndex().url,
        pagination,
        filters,
        only: ['agencies', 'pagination', 'filters', 'favoritesCount'],
    });
    const favoritesOnly = filters.favorites === '1';

    return (
        <>
            <Head title="Agences immobilières" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Agences</h1>
                        <p className="text-muted-foreground text-sm">
                            {pagination.total} agence(s) partenaire(s)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <FavoritesFilter
                            active={favoritesOnly}
                            onChange={(active) =>
                                server.setFilter(
                                    'favorites',
                                    active ? '1' : null,
                                )
                            }
                            count={favoritesCount}
                        />
                        <Button
                            variant="outline"
                            onClick={() => setImportOpen(true)}
                        >
                            <Upload />
                            Importer
                        </Button>
                        <Button onClick={add}>
                            <Plus />
                            Nouvelle agence
                        </Button>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={agencies}
                    server={server}
                    filterColumn="name"
                    filterPlaceholder="Rechercher une agence (nom, ville)…"
                    bulkActions={(rows, clear) => (
                        <DirectoryBulkActions
                            ids={rows.map((row) => row.id)}
                            url={bulkDestroy().url}
                            title={`Supprimer ${rows.length} agence(s) ?`}
                            description="Leurs agents sont conservés, sans agence. Cette action est irréversible."
                            onDone={clear}
                            canDelete={auth.user.role === 'admin'}
                        />
                    )}
                    columnLabels={agencyColumnLabels}
                    frame="panel"
                />
            </div>
            <AgencyImportDialog
                open={importOpen}
                onOpenChange={setImportOpen}
            />
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
