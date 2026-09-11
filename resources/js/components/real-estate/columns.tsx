import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { FavoriteStar } from '@/components/favorite-star';
import { AgencyAgentsPopover } from '@/components/real-estate/agency-agents-popover';
import { AgentLeadsPopover } from '@/components/real-estate/agent-leads-popover';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    destroy as destroyAgency,
    favorite as favoriteAgency,
    show as agencyShow,
} from '@/routes/agencies';
import {
    destroy as destroyAgent,
    favorite as favoriteAgent,
    show as agentShow,
} from '@/routes/agents';
import type { Agency, Agent } from '@/types';

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

function contactCell(email: string | null, phone: string | null) {
    if (!email && !phone) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <div className="grid text-sm">
            {email && (
                <a
                    href={`mailto:${email}`}
                    className="truncate underline-offset-4 hover:underline"
                >
                    {email}
                </a>
            )}
            {phone && (
                <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="text-muted-foreground underline-offset-4 hover:underline"
                >
                    {phone}
                </a>
            )}
        </div>
    );
}

export const agencyColumnLabels: Record<string, string> = {
    name: 'Agence',
    address: 'Adresse',
    contact: 'Contact',
    agents_count: 'Agents',
    last_contacted_at: 'Dernier échange',
    creator: 'Ajouté par',
};

const exchangeDate = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

/** Dernier échange noté, ou un tiret : trié du plus ancien au plus récent. */
function lastContactCell(iso: string | null) {
    return (
        <span className="text-muted-foreground text-sm tabular-nums">
            {iso ? exchangeDate.format(new Date(iso)) : '—'}
        </span>
    );
}

function creatorCell(creator: string | null, avatar: string | null) {
    return (
        <span className="text-muted-foreground text-sm">
            <CreatedBy name={creator} avatar={avatar} verb="" />
        </span>
    );
}

/** Adresse sur une ligne : « 12 rue de Turenne, 75003 Paris ». */
export function formatAddress(place: {
    street: string | null;
    postal_code: string | null;
    city: string | null;
}): string | null {
    const line = [place.postal_code, place.city].filter(Boolean).join(' ');
    const parts = [place.street, line].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
}

export function agencyColumns(
    onEdit: (agency: Agency) => void,
    onAddAgent: (agency: Agency) => void,
): ColumnDef<Agency>[] {
    return [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Tout sélectionner"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label={`Sélectionner ${row.original.name}`}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader
                    label="Agence"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div className="grid">
                    <span className="flex items-center gap-1.5">
                        <Link
                            href={agencyShow({ agency: row.original.uuid })}
                            className="font-medium hover:underline"
                        >
                            {row.original.name}
                        </Link>
                        <FavoriteStar favorite={row.original.is_favorite} />
                    </span>
                    {row.original.website && (
                        <a
                            href={row.original.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground truncate text-xs underline-offset-4 hover:underline"
                        >
                            {row.original.website.replace(/^https?:\/\//, '')}
                        </a>
                    )}
                </div>
            ),
        },
        {
            id: 'address',
            header: 'Adresse',
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {formatAddress(row.original) ?? '—'}
                </span>
            ),
        },
        {
            id: 'contact',
            header: 'Contact',
            cell: ({ row }) =>
                contactCell(row.original.email, row.original.phone),
        },
        {
            accessorKey: 'agents_count',
            header: ({ column }) => (
                <div className="text-right">
                    <SortableHeader
                        label="Agents"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-right">
                    <AgencyAgentsPopover
                        agency={row.original}
                        onAddAgent={onAddAgent}
                    />
                </div>
            ),
        },
        {
            accessorKey: 'last_contacted_at',
            header: ({ column }) => (
                <SortableHeader
                    label="Dernier échange"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => lastContactCell(row.original.last_contacted_at),
        },
        {
            id: 'creator',
            accessorFn: (agency) => agency.creator ?? '',
            header: 'Ajouté par',
            cell: ({ row }) =>
                creatorCell(row.original.creator, row.original.creator_avatar),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => (
                <div className="text-right">
                    <RealEstateRowActions
                        name={row.original.name}
                        deleteUrl={
                            destroyAgency({ agency: row.original.uuid }).url
                        }
                        deleteTitle={`Supprimer l’agence ${row.original.name} ?`}
                        deleteDescription="Ses agents sont conservés, sans agence. Cette action est irréversible."
                        onEdit={() => onEdit(row.original)}
                        favorite={{
                            active: row.original.is_favorite,
                            url: favoriteAgency({ agency: row.original.uuid })
                                .url,
                        }}
                    />
                </div>
            ),
        },
    ];
}

export const agentColumnLabels: Record<string, string> = {
    name: 'Agent',
    agency: 'Agence',
    address: 'Adresse',
    contact: 'Contact',
    leads: 'Leads',
    visits_count: 'Visites',
    last_contacted_at: 'Dernier échange',
    creator: 'Ajouté par',
};

export function agentColumns(
    onEdit: (agent: Agent) => void,
): ColumnDef<Agent>[] {
    return [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Tout sélectionner"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label={`Sélectionner ${row.original.name}`}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader
                    label="Agent"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div className="grid">
                    <span className="flex items-center gap-1.5">
                        <Link
                            href={agentShow({ agent: row.original.uuid })}
                            className="font-medium hover:underline"
                        >
                            {row.original.name}
                        </Link>
                        <FavoriteStar favorite={row.original.is_favorite} />
                    </span>
                    {row.original.position && (
                        <span className="text-muted-foreground text-xs">
                            {row.original.position}
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'agency',
            accessorFn: (agent) => agent.agency?.name ?? '',
            header: ({ column }) => (
                <SortableHeader
                    label="Agence"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) =>
                row.original.agency ? (
                    row.original.agency.name
                ) : (
                    <span className="text-muted-foreground">Indépendant</span>
                ),
        },
        {
            id: 'address',
            header: 'Adresse',
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {formatAddress(row.original) ?? '—'}
                </span>
            ),
        },
        {
            id: 'contact',
            header: 'Contact',
            cell: ({ row }) =>
                contactCell(row.original.email, row.original.phone),
        },
        {
            id: 'leads',
            accessorFn: (agent) => agent.leads.length,
            header: ({ column }) => (
                <div className="text-right">
                    <SortableHeader
                        label="Leads"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-right">
                    <AgentLeadsPopover agent={row.original} />
                </div>
            ),
        },
        {
            accessorKey: 'visits_count',
            header: () => <div className="text-right">Visites</div>,
            cell: ({ row }) => (
                <div className="text-right text-sm tabular-nums">
                    {row.original.visits_count > 0
                        ? row.original.visits_count
                        : '—'}
                </div>
            ),
        },
        {
            accessorKey: 'last_contacted_at',
            header: ({ column }) => (
                <SortableHeader
                    label="Dernier échange"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => lastContactCell(row.original.last_contacted_at),
        },
        {
            id: 'creator',
            accessorFn: (agent) => agent.creator ?? '',
            header: 'Ajouté par',
            cell: ({ row }) =>
                creatorCell(row.original.creator, row.original.creator_avatar),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => (
                <div className="text-right">
                    <RealEstateRowActions
                        name={row.original.name}
                        deleteUrl={
                            destroyAgent({ agent: row.original.uuid }).url
                        }
                        deleteTitle={`Supprimer l’agent ${row.original.name} ?`}
                        deleteDescription="Sa fiche sera effacée. Cette action est irréversible."
                        onEdit={() => onEdit(row.original)}
                        favorite={{
                            active: row.original.is_favorite,
                            url: favoriteAgent({ agent: row.original.uuid })
                                .url,
                        }}
                    />
                </div>
            ),
        },
    ];
}
