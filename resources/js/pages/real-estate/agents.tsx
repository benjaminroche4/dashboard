import { Head, usePage } from '@inertiajs/react';
import { Plus, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { DirectoryBulkActions } from '@/components/real-estate/directory-bulk-actions';
import { FavoritesFilter } from '@/components/favorites-filter';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { AgentImportDialog } from '@/components/real-estate/agent-import-dialog';
import {
    agentColumnLabels,
    agentColumns,
} from '@/components/real-estate/columns';
import { Button } from '@/components/ui/button';
import {
    useServerTable,
    type ServerPagination,
    type ServerTableFilters,
} from '@/hooks/use-server-table';
import { bulkDestroy, index as agentsIndex } from '@/routes/agents';
import type { AgencyOption, Agent } from '@/types';

type Props = {
    /** Page courante de l'annuaire (50 agents), paginée côté serveur. */
    agents: Agent[];
    agencies: AgencyOption[];
    pagination: ServerPagination;
    filters: ServerTableFilters;
    /** Nombre total de favoris du membre, toutes pages confondues. */
    favoritesCount: number;
};

export default function Agents({
    agents,
    agencies,
    pagination,
    filters,
    favoritesCount,
}: Props) {
    const { auth } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Agent | null>(null);
    const [importOpen, setImportOpen] = useState(false);

    const add = () => {
        setEditing(null);
        setDialogOpen(true);
    };
    const edit = (agent: Agent) => {
        setEditing(agent);
        setDialogOpen(true);
    };
    const columns = useMemo(() => agentColumns(edit), []);
    const server = useServerTable({
        url: agentsIndex().url,
        pagination,
        filters,
        only: ['agents', 'pagination', 'filters', 'favoritesCount'],
    });
    const favoritesOnly = filters.favorites === '1';

    return (
        <>
            <Head title="Agents immobiliers" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Agents</h1>
                        <p className="text-muted-foreground text-sm">
                            {pagination.total} agent(s) immobilier(s)
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                            Nouvel agent
                        </Button>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={agents}
                    server={server}
                    filterColumn="name"
                    filterPlaceholder="Rechercher un agent (nom, agence, ville)…"
                    bulkActions={(rows, clear) => (
                        <DirectoryBulkActions
                            ids={rows.map((row) => row.id)}
                            url={bulkDestroy().url}
                            title={`Supprimer ${rows.length} agent(s) ?`}
                            description="Leurs fiches seront effacées. Les leads en contact avec eux sont conservés, sans agent. Cette action est irréversible."
                            onDone={clear}
                            canDelete={auth.user.role === 'admin'}
                        />
                    )}
                    columnLabels={agentColumnLabels}
                    frame="panel"
                />
            </div>
            <AgentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                agencies={agencies}
                agent={editing}
            />
            <AgentImportDialog open={importOpen} onOpenChange={setImportOpen} />
        </>
    );
}

Agents.layout = {
    breadcrumbs: [
        { title: 'Agents immobiliers', href: agentsIndex() },
        { title: 'Agents', href: agentsIndex() },
    ],
};
