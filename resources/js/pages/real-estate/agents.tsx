import { Head } from '@inertiajs/react';
import { Plus, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { AgentImportDialog } from '@/components/real-estate/agent-import-dialog';
import {
    agentColumnLabels,
    agentColumns,
} from '@/components/real-estate/columns';
import { Button } from '@/components/ui/button';
import { index as agentsIndex } from '@/routes/agents';
import type { AgencyOption, Agent } from '@/types';

type Props = {
    agents: Agent[];
    agencies: AgencyOption[];
};

export default function Agents({ agents, agencies }: Props) {
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

    return (
        <>
            <Head title="Agents immobiliers" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Agents</h1>
                        <p className="text-muted-foreground text-sm">
                            {agents.length} agent(s) immobilier(s)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                    filterColumn="name"
                    filterPlaceholder="Filtrer par agent…"
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
