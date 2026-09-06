import { Head, Link, usePage } from '@inertiajs/react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import {
    documentColumnLabels,
    documentColumns,
} from '@/components/documents/columns';
import { DocumentRequestBulkActions } from '@/components/documents/document-request-bulk-actions';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { index as toolsIndex } from '@/routes/tools';
import {
    create as documentsCreate,
    index as documentsIndex,
} from '@/routes/tools/documents';
import { index as catalogIndex } from '@/routes/tools/documents/catalog';
import type { DocumentRequestSummary } from '@/types';

type Props = {
    requests: DocumentRequestSummary[];
};

export default function DocumentsIndex({ requests }: Props) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Demandes de documents" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            Demandes de documents
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {requests.length} demande(s)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild>
                            <Link href={documentsCreate()}>
                                <Plus />
                                Nouvelle demande
                            </Link>
                        </Button>
                        {auth.user.role === 'admin' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        aria-label="Plus d’actions"
                                    >
                                        <MoreHorizontal aria-hidden />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={catalogIndex()}>
                                            Modifier les pièces
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
                <DataTable
                    columns={documentColumns}
                    data={requests}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par client…"
                    columnLabels={documentColumnLabels}
                    frame="panel"
                    bulkActions={(rows, clear) => (
                        <DocumentRequestBulkActions
                            requests={rows}
                            onDone={clear}
                            canDelete={auth.user.role === 'admin'}
                        />
                    )}
                />
            </div>
        </>
    );
}

DocumentsIndex.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Documents', href: documentsIndex() },
    ],
};
