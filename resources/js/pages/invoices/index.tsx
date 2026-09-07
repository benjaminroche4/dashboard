import { Head, Link, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import {
    invoiceColumnLabels,
    invoiceColumns,
} from '@/components/invoices/columns';
import { InvoiceBulkActions } from '@/components/invoices/invoice-bulk-actions';
import { Button } from '@/components/ui/button';
import {
    create as invoicesCreate,
    index as invoicesIndex,
} from '@/routes/invoices';
import { index as toolsIndex } from '@/routes/tools';
import type { Invoice } from '@/types';

type Props = {
    invoices: Invoice[];
    statuses: { value: string; label: string }[];
};

export default function InvoicesIndex({ invoices }: Props) {
    const { auth } = usePage().props;
    // Les membres consultent seulement : pas d'actions groupées (le backend refuse de toute façon).
    const canManage = auth.user.role !== 'member';
    const overdue = invoices.filter(
        (invoice) => invoice.status === 'overdue',
    ).length;
    const summary = `${invoices.length} facture(s)${overdue > 0 ? ` · ${overdue} en retard` : ''}`;

    return (
        <>
            <Head title="Factures" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Factures</h1>
                        <p className="text-muted-foreground text-sm">
                            {summary}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={invoicesCreate()}>
                            <Plus />
                            Nouvelle facture
                        </Link>
                    </Button>
                </div>
                <DataTable
                    columns={invoiceColumns}
                    data={invoices}
                    filterColumn="client_name"
                    filterPlaceholder="Filtrer par client…"
                    columnLabels={invoiceColumnLabels}
                    frame="panel"
                    bulkActions={
                        canManage
                            ? (rows, clear) => (
                                  <InvoiceBulkActions
                                      invoices={rows}
                                      onDone={clear}
                                  />
                              )
                            : undefined
                    }
                />
            </div>
        </>
    );
}

InvoicesIndex.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Factures', href: invoicesIndex() },
    ],
};
