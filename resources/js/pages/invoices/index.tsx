import { Head } from '@inertiajs/react';
import { DataTable } from '@/components/data-table';
import {
    invoiceColumnLabels,
    invoiceColumns,
} from '@/components/invoices/columns';
import { index as invoicesIndex } from '@/routes/invoices';
import type { Invoice } from '@/types';

type Props = {
    invoices: Invoice[];
    statuses: { value: string; label: string }[];
};

export default function InvoicesIndex({ invoices }: Props) {
    return (
        <>
            <Head title="Factures" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4">
                <DataTable
                    columns={invoiceColumns}
                    data={invoices}
                    filterColumn="client_name"
                    filterPlaceholder="Filtrer par client…"
                    columnLabels={invoiceColumnLabels}
                />
            </div>
        </>
    );
}

InvoicesIndex.layout = {
    breadcrumbs: [
        { title: 'Leads', href: '#' },
        { title: 'Factures', href: invoicesIndex() },
    ],
};
