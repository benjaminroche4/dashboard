import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { DocumentUploadList } from '@/components/documents/document-upload-list';
import { Button } from '@/components/ui/button';
import { categoryIcon } from '@/lib/document-category-icons';
import type { DocumentUpload, HouseholdPersonDetail } from '@/types';

/** En-tête triable, comme sur la liste des biens. */
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

/** Une pièce demandée à une personne, à plat : une ligne du tableau. */
export type PersonDocumentRow = {
    category: string;
    categoryLabel: string;
    label: string;
    hint: string | null;
    uploads: DocumentUpload[];
};

/**
 * Les pièces d'une personne, mises à plat. Le tableau trie et filtre ligne par
 * ligne : chacune porte donc sa catégorie, au lieu de la laisser coiffer un
 * groupe qu'un tri disperserait.
 */
export function personDocumentRows(
    person: HouseholdPersonDetail,
): PersonDocumentRow[] {
    return person.categories.flatMap((category) =>
        category.documents.map((document) => ({
            category: category.value,
            categoryLabel: category.label,
            label: document.label,
            hint: document.hint,
            uploads: document.uploads ?? [],
        })),
    );
}

export const personDocumentColumnLabels = {
    categoryLabel: 'Catégorie',
    label: 'Pièce',
    uploads: 'Fichiers reçus',
};

/**
 * Colonnes des pièces demandées à une personne : la catégorie, la pièce avec
 * son aide, et les fichiers reçus.
 */
export function personDocumentColumns(
    requestUuid?: string,
    canReview = false,
): ColumnDef<PersonDocumentRow>[] {
    return [
        {
            accessorKey: 'categoryLabel',
            header: ({ column }) => (
                <SortableHeader
                    label="Catégorie"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => {
                const Icon = categoryIcon(row.original.category);

                return (
                    <span className="flex items-center gap-2 text-sm">
                        <Icon
                            aria-hidden="true"
                            className="text-muted-foreground size-4 shrink-0"
                        />
                        <span className="truncate">
                            {row.original.categoryLabel}
                        </span>
                    </span>
                );
            },
        },
        {
            accessorKey: 'label',
            header: ({ column }) => (
                <SortableHeader
                    label="Pièce"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div className="grid gap-0.5">
                    <span className="text-sm">{row.original.label}</span>
                    {row.original.hint && (
                        <span className="text-muted-foreground text-xs">
                            {row.original.hint}
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'uploads',
            accessorFn: (row) => row.uploads.length,
            header: 'Fichiers reçus',
            cell: ({ row }) =>
                requestUuid && row.original.uploads.length > 0 ? (
                    <DocumentUploadList
                        requestUuid={requestUuid}
                        uploads={row.original.uploads}
                        canReview={canReview}
                    />
                ) : (
                    <span className="text-muted-foreground text-sm">
                        Rien de déposé
                    </span>
                ),
        },
    ];
}
