import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { formatAddress } from '@/components/real-estate/columns';
import { Button } from '@/components/ui/button';
import { VisitRowActions } from '@/components/visits/visit-row-actions';
import { VisitReportBadge } from '@/components/visits/visit-report-badge';
import { VisitModeBadge } from '@/components/visits/visit-mode-badge';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { formatMoney } from '@/lib/format';
import { show as agentShow } from '@/routes/agents';
import { show as clientShow } from '@/routes/clients';
import type { Visit } from '@/types';

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

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

export const visitColumnLabels: Record<string, string> = {
    scheduled_at: 'Date',
    client: 'Client',
    property: 'Bien',
    mode: 'Réalisée par',
    status_label: 'Statut',
    agent: 'Agent',
    assignee: 'Membre',
    creator: 'Planifiée par',
};

export const visitColumns: ColumnDef<Visit>[] = [
    {
        accessorKey: 'scheduled_at',
        header: ({ column }) => (
            <SortableHeader
                label="Date"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) => (
            <span className="text-sm font-medium capitalize tabular-nums">
                {dateTime.format(new Date(row.original.scheduled_at))}
            </span>
        ),
    },
    {
        id: 'client',
        accessorFn: (visit) => visit.client.name,
        header: 'Client',
        cell: ({ row }) => (
            <div className="grid">
                <Link
                    href={clientShow({ lead: row.original.client.uuid })}
                    className="font-medium underline-offset-4 hover:underline"
                >
                    {row.original.client.name}
                </Link>
                {row.original.client.reference && (
                    <span className="text-muted-foreground text-xs">
                        {row.original.client.reference}
                    </span>
                )}
            </div>
        ),
    },
    {
        id: 'property',
        accessorFn: (visit) => visit.property.label,
        header: 'Bien',
        cell: ({ row }) => {
            const { property } = row.original;

            return (
                <div className="grid text-sm">
                    <span className="font-medium">{property.label}</span>
                    <span className="text-muted-foreground truncate text-xs">
                        {formatAddress(property) ?? '—'}
                        {property.rent_cents !== null &&
                            ` · ${formatMoney(property.rent_cents, property.currency)} / mois`}
                    </span>
                </div>
            );
        },
    },
    {
        id: 'mode',
        accessorFn: (visit) => visit.mode,
        header: 'Réalisée par',
        cell: ({ row }) => <VisitModeBadge mode={row.original.mode} />,
    },
    {
        accessorKey: 'status_label',
        header: 'Statut',
        cell: ({ row }) => (
            <div className="flex flex-wrap items-center gap-1">
                <VisitStatusBadge
                    status={row.original.status}
                    label={row.original.status_label}
                />
                <VisitReportBadge visit={row.original} />
            </div>
        ),
    },
    {
        id: 'agent',
        accessorFn: (visit) => visit.agent?.name ?? '',
        header: 'Agent',
        cell: ({ row }) =>
            row.original.agent ? (
                <Link
                    href={agentShow({ agent: row.original.agent.uuid })}
                    className="text-sm underline-offset-4 hover:underline"
                >
                    {row.original.agent.name}
                </Link>
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
    },
    {
        id: 'assignee',
        accessorFn: (visit) => visit.assignee?.name ?? '',
        header: 'Membre',
        cell: ({ row }) =>
            row.original.assignee ? (
                <span className="text-sm">
                    <CreatedBy
                        name={row.original.assignee.name}
                        avatar={row.original.assignee.avatar}
                        verb=""
                    />
                </span>
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
    },
    {
        id: 'creator',
        accessorFn: (visit) => visit.creator ?? '',
        header: 'Planifiée par',
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
                <VisitRowActions visit={row.original} />
            </div>
        ),
    },
];
