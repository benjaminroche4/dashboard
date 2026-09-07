import { Head } from '@inertiajs/react';
import { DataTable } from '@/components/data-table';
import {
    clientColumnLabels,
    clientColumns,
} from '@/components/clients/columns';
import { index as clientsIndex } from '@/routes/clients';
import type { Client } from '@/types';

type Props = {
    clients: Client[];
};

export default function ClientsIndex({ clients }: Props) {
    return (
        <>
            <Head title="Dossiers" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="pt-8 pb-6">
                    <h1 className="text-lg font-medium">Dossiers</h1>
                    <p className="text-muted-foreground text-sm">
                        {clients.length} client{clients.length > 1 ? 's' : ''} :
                        les leads convertis, suivis jusqu’à l’installation.
                    </p>
                </div>
                <DataTable
                    columns={clientColumns}
                    data={clients}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par client…"
                    columnLabels={clientColumnLabels}
                    frame="panel"
                />
            </div>
        </>
    );
}

ClientsIndex.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Dossiers', href: clientsIndex() },
    ],
};
