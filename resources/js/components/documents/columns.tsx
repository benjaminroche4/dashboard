import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { CountryFlag } from '@/components/country-flag';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DocumentRequestRowActions } from '@/components/documents/document-request-row-actions';
import { show as documentsShow } from '@/routes/tools/documents';
import { languageFlag } from '@/lib/language-flag';
import type { DocumentRequestSummary } from '@/types';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

/** « 06 sept. 2026 » à partir d'un horodatage ISO complet. */
export function formatRequestDate(iso: string | null): string {
    return iso ? dateFormatter.format(new Date(iso)) : '—';
}

export const documentColumnLabels: Record<string, string> = {
    name: 'Client',
    language_label: 'Langue',
    person_count: 'Personnes',
    document_count: 'Pièces',
    creator: 'Créée par',
    created_at: 'Date',
};

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

export const documentColumns: ColumnDef<DocumentRequestSummary>[] = [
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
                label="Client"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) => (
            <div className="grid">
                <Link
                    href={documentsShow({ documentRequest: row.original.uuid })}
                    className="font-medium hover:underline"
                >
                    {row.original.name}
                </Link>
                {row.original.lead && (
                    <span className="text-muted-foreground text-xs">
                        Lead : {row.original.lead.name}
                    </span>
                )}
            </div>
        ),
    },
    {
        accessorKey: 'language_label',
        header: 'Langue',
        cell: ({ row }) => (
            <span className="flex items-center gap-2">
                <CountryFlag code={languageFlag(row.original.language)} />
                {row.original.language_label}
            </span>
        ),
    },
    {
        accessorKey: 'person_count',
        header: () => <div className="text-right">Personnes</div>,
        cell: ({ row }) => (
            <div className="text-right tabular-nums">
                {row.original.person_count}
            </div>
        ),
    },
    {
        accessorKey: 'document_count',
        header: () => <div className="text-right">Pièces</div>,
        cell: ({ row }) => (
            <div className="text-right tabular-nums">
                {row.original.document_count}
            </div>
        ),
    },
    {
        accessorKey: 'creator',
        header: 'Créée par',
        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {row.original.creator ?? '—'}
            </span>
        ),
    },
    {
        accessorKey: 'created_at',
        header: ({ column }) => (
            <SortableHeader
                label="Date"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            />
        ),
        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {formatRequestDate(row.original.created_at)}
            </span>
        ),
    },
    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => <DocumentRequestRowActions request={row.original} />,
    },
];
