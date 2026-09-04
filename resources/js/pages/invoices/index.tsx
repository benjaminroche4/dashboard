import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import {
    invoiceColumnLabels,
    invoiceColumns,
} from '@/components/invoices/columns';
import {
    create as invoicesCreate,
    index as invoicesIndex,
} from '@/routes/invoices';
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
                <div className="flex items-center justify-between pt-6 pb-2">
                    <h1 className="text-lg font-medium">Factures</h1>
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
