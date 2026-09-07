import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
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
    arrival_at: 'Arrivée',
    converted_at: 'Client depuis',
    assignee: 'Suivi par',
    documents: 'Dossier',
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
            <div className="grid">
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
        accessorKey: 'arrival_at',
        header: ({ column }) => (
            <SortableHeader
                label="Arrivée"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) =>
            row.original.arrival_at ? (
                formatDate(row.original.arrival_at)
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
        id: 'documents',
        header: 'Dossier',
        cell: ({ row }) => {
            const { invoices_count, document_requests_count } = row.original;

            return (
                <span className="text-muted-foreground text-sm tabular-nums">
                    {invoices_count} facture{invoices_count > 1 ? 's' : ''} ·{' '}
                    {document_requests_count} demande
                    {document_requests_count > 1 ? 's' : ''}
                </span>
            );
        },
    },
];
