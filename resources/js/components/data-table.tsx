import {
    type ColumnDef,
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
    type VisibilityState,
} from '@tanstack/react-table';
import { ChevronDown, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** Habillage du tableau : bordure arrondie (défaut) ou panneau gris façon sidebar. */
export type DataTableFrame = 'bordered' | 'panel';

const frames: Record<
    DataTableFrame,
    { wrapper: string; table: string; toolbar: string; footer: string }
> = {
    bordered: {
        wrapper: '',
        table: 'overflow-hidden rounded-md border',
        toolbar: 'pb-4',
        footer: 'py-4',
    },
    panel: {
        wrapper: 'bg-sidebar rounded-xl border p-3',
        table: 'bg-background overflow-hidden rounded-lg border',
        toolbar: 'px-1 pb-4 pt-1',
        footer: 'px-1 pt-4 pb-1',
    },
};

type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    /** Colonne utilisée par le champ de recherche. */
    filterColumn?: string;
    filterPlaceholder?: string;
    /** Libellés des colonnes pour le menu de visibilité. */
    columnLabels?: Record<string, string>;
    pageSize?: number;
    /** Titre affiché à gauche de la barre d'outils. */
    title?: ReactNode;
    /** Actions affichées à droite de la barre d'outils (ex. bouton Nouvelle facture). */
    actions?: ReactNode;
    frame?: DataTableFrame;
    className?: string;
    /**
     * Actions groupées, rendues dans le pied dès qu'une ligne est cochée,
     * avec les lignes sélectionnées et une fonction pour vider la sélection.
     */
    bulkActions?: (rows: TData[], clearSelection: () => void) => ReactNode;
};

/**
 * Data Table shadcn : tri, filtre, sélection, visibilité des colonnes,
 * pagination côté client (TanStack Table).
 */
export function DataTable<TData, TValue>({
    columns,
    data,
    filterColumn,
    filterPlaceholder = 'Filtrer…',
    columnLabels = {},
    pageSize = 50,
    title,
    actions,
    frame = 'bordered',
    className,
    bulkActions,
}: DataTableProps<TData, TValue>) {
    const styles = frames[frame];
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        {},
    );
    const [rowSelection, setRowSelection] = useState({});

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        initialState: { pagination: { pageSize } },
        state: { sorting, columnFilters, columnVisibility, rowSelection },
    });

    const selectedRows = table.getFilteredSelectedRowModel().rows;

    return (
        <div className={cn('w-full', styles.wrapper, className)}>
            <div className={cn('flex items-center gap-2', styles.toolbar)}>
                {title && <div className="mr-auto">{title}</div>}
                {filterColumn && (
                    <Input
                        placeholder={filterPlaceholder}
                        value={
                            (table
                                .getColumn(filterColumn)
                                ?.getFilterValue() as string) ?? ''
                        }
                        onChange={(event) =>
                            table
                                .getColumn(filterColumn)
                                ?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(!title && 'ml-auto')}
                        >
                            Colonnes <ChevronDown />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) =>
                                        column.toggleVisibility(!!value)
                                    }
                                >
                                    {columnLabels[column.id] ?? column.id}
                                </DropdownMenuCheckboxItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                {actions}
            </div>
            <div className={styles.table}>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            header.column.id === 'actions' &&
                                                'bg-background sticky right-0 z-10',
                                        )}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && 'selected'
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                // Le menu « … » reste visible à droite quand le tableau défile.
                                                cell.column.id === 'actions' &&
                                                    'bg-background sticky right-0 z-10 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]',
                                            )}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Aucun résultat.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div
                className={cn(
                    'flex items-center justify-end space-x-2',
                    styles.footer,
                )}
            >
                <div className="text-muted-foreground flex-1 text-sm">
                    {table.getFilteredSelectedRowModel().rows.length} sur{' '}
                    {table.getFilteredRowModel().rows.length} ligne(s)
                    sélectionnée(s).
                </div>
                {/* Pagination affichée seulement au-delà d'une page. */}
                {table.getPageCount() > 1 && (
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Précédent
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Suivant
                        </Button>
                    </div>
                )}
            </div>
            {/* Îlot flottant des actions groupées : collé en bas de l'écran, centré sur le tableau. */}
            {bulkActions && selectedRows.length > 0 && (
                <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center">
                    <div
                        role="region"
                        aria-label="Sélection"
                        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 animate-in fade-in slide-in-from-bottom-2 ring-foreground/10 pointer-events-auto flex flex-wrap items-center gap-3 rounded-full border px-4 py-2 shadow-lg ring-1 backdrop-blur duration-200"
                    >
                        <span className="text-sm font-medium tabular-nums">
                            {selectedRows.length} sélectionnée(s)
                        </span>
                        {bulkActions(
                            selectedRows.map((row) => row.original),
                            () => table.resetRowSelection(),
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => table.resetRowSelection()}
                            aria-label="Désélectionner tout"
                        >
                            <X />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
