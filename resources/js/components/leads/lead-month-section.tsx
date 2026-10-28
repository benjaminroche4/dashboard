import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { leadTableColumns } from '@/components/leads/lead-table-columns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { LeadMonthGroup } from '@/lib/kanban';

/**
 * Un mois d'emménagement : en-tête « Novembre 2026 · 3 leads » dans le
 * panneau gris, puis le tableau des leads de ce mois (mêmes colonnes que la
 * vue tableau, triables, sans barre d'outils ni pagination : chaque mois en a peu).
 */
export function LeadMonthSection({ group }: { group: LeadMonthGroup }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const table = useReactTable({
        data: group.leads,
        columns: leadTableColumns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (lead) => lead.uuid,
    });
    const count = group.leads.length;

    return (
        <section
            aria-label={group.label}
            data-month={group.key}
            className="bg-sidebar grid gap-3 rounded-xl border p-3"
        >
            <header className="flex flex-wrap items-baseline gap-2 px-1">
                <h2 className="text-base font-medium">{group.label}</h2>
                <span className="text-muted-foreground text-sm tabular-nums">
                    {count} lead{count > 1 ? 's' : ''}
                </span>
            </header>
            <div className="bg-background overflow-hidden rounded-lg border">
                {/* Largeurs fixes : les tableaux de chaque mois s'alignent entre eux. */}
                <Table className="table-fixed">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="align-top"
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
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className="align-top"
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </section>
    );
}
