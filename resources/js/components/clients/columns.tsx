import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { ArrivalProgress } from '@/components/clients/arrival-progress';
import { FolderIllustration } from '@/components/folder-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { show as clientShow } from '@/routes/clients';
import type { Client } from '@/types';

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

export const clientColumnLabels: Record<string, string> = {
    name: 'Client',
    contact: 'Contact',
    offer_label: 'Formule',
    converted_at: 'Client depuis',
    assignee: 'Suivi par',
    arrival_at: 'Arrivée',
};

const initials = (name: string) =>
    name
        .split(/\s+/)
        .map((part) => part[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

export const clientColumns: ColumnDef<Client>[] = [
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <SortableHeader
                label="Client"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                {/* Chemise miniature (maquette Figma « Folder Card ») : ses pages sortent au survol de la ligne. */}
                <div className="h-7 w-9 shrink-0">
                    <FolderIllustration className="origin-top-left scale-[0.2]" />
                </div>
                <div className="grid min-w-0">
                    <Link
                        href={clientShow({ lead: row.original.uuid })}
                        className="font-medium hover:underline"
                    >
                        {row.original.name}
                    </Link>
                    <span className="text-muted-foreground truncate text-xs">
                        {row.original.company ?? row.original.reference}
                    </span>
                </div>
            </div>
        ),
    },
    {
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => {
            const { email, phone } = row.original;

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
                            className="text-muted-foreground truncate underline-offset-4 hover:underline"
                        >
                            {phone}
                        </a>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: 'offer_label',
        header: 'Formule',
        cell: ({ row }) =>
            row.original.offer_label ? (
                <Badge variant="secondary" className="font-medium">
                    {row.original.offer_label}
                </Badge>
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
    },
    {
        accessorKey: 'converted_at',
        header: ({ column }) => (
            <SortableHeader
                label="Client depuis"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) =>
            row.original.converted_at ? (
                formatDate(row.original.converted_at.slice(0, 10))
            ) : (
                <span className="text-muted-foreground">—</span>
            ),
    },
    {
        id: 'assignee',
        header: 'Suivi par',
        cell: ({ row }) => {
            const assignee = row.original.assignee;

            if (!assignee) {
                return (
                    <span className="text-muted-foreground">Non attribué</span>
                );
            }

            return (
                <span className="flex items-center gap-2">
                    <Avatar className="size-6">
                        {assignee.avatar && (
                            <AvatarImage src={assignee.avatar} alt="" />
                        )}
                        <AvatarFallback className="text-[10px]">
                            {initials(assignee.name)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{assignee.name}</span>
                </span>
            );
        },
    },
    {
        accessorKey: 'arrival_at',
        header: ({ column }) => (
            <SortableHeader
                label="Arrivée"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        // Barre d'avancement de la conversion à l'arrivée, avec la date et le compte à rebours.
        cell: ({ row }) => (
            <ArrivalProgress
                convertedAt={row.original.converted_at}
                arrivalAt={row.original.arrival_at}
            />
        ),
    },
];
