import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { DataTable } from '@/components/data-table';
import {
    invoiceColumnLabels,
    invoiceColumns,
} from '@/components/invoices/columns';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    create as invoicesCreate,
    index as invoicesIndex,
} from '@/routes/invoices';
import type { Invoice } from '@/types';

type Props = {
    invoices: Invoice[];
    statuses: { value: string; label: string }[];
};

function Option({
    label,
    hidden = false,
    children,
}: {
    label: string;
    hidden?: boolean;
    children: ReactNode;
}) {
    return (
        <div data-uidotsh-option={label} className="contents" hidden={hidden}>
            {children}
        </div>
    );
}

function NewInvoiceButton({ size }: { size?: 'sm' | 'default' }) {
    return (
        <Button asChild size={size}>
            <Link href={invoicesCreate()}>
                <Plus />
                Nouvelle facture
            </Link>
        </Button>
    );
}

export default function InvoicesIndex({ invoices }: Props) {
    const overdue = invoices.filter(
        (invoice) => invoice.status === 'overdue',
    ).length;
    const summary = `${invoices.length} facture(s)${overdue > 0 ? ` · ${overdue} en retard` : ''}`;
    const tableProps = {
        columns: invoiceColumns,
        data: invoices,
        filterColumn: 'client_name',
        filterPlaceholder: 'Filtrer par client…',
        columnLabels: invoiceColumnLabels,
    };

    return (
        <>
            <Head title="Factures" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4">
                <div
                    data-uidotsh-pick="Composition de la page Factures"
                    className="contents"
                >
                    {/* 1 — Actuel : titre + bouton, puis barre d'outils, puis tableau bordé */}
                    <Option label="Titre puis outils (current)">
                        <div className="flex items-center justify-between pt-6 pb-2">
                            <h1 className="text-lg font-medium">Factures</h1>
                            <NewInvoiceButton />
                        </div>
                        <DataTable {...tableProps} />
                    </Option>

                    {/* 2 — Carte : tout dans une Card shadcn */}
                    <Option label="Carte" hidden>
                        <Card className="mt-6 gap-4">
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <CardTitle>Factures</CardTitle>
                                    <CardDescription>{summary}</CardDescription>
                                </div>
                                <NewInvoiceButton size="sm" />
                            </CardHeader>
                            <CardContent>
                                <DataTable {...tableProps} />
                            </CardContent>
                        </Card>
                    </Option>

                    {/* 3 — Barre unifiée : titre, filtre, colonnes et bouton sur une ligne */}
                    <Option label="Barre unifiée" hidden>
                        <div className="pt-6">
                            <DataTable
                                {...tableProps}
                                title={
                                    <div>
                                        <h1 className="text-lg font-medium">
                                            Factures
                                        </h1>
                                        <p className="text-muted-foreground text-sm">
                                            {summary}
                                        </p>
                                    </div>
                                }
                                actions={<NewInvoiceButton />}
                            />
                        </div>
                    </Option>

                    {/* 4 — Panneau : tableau dans un panneau gris façon sidebar */}
                    <Option label="Panneau" hidden>
                        <div className="flex items-end justify-between pt-6 pb-4">
                            <div>
                                <h1 className="text-lg font-medium">
                                    Factures
                                </h1>
                                <p className="text-muted-foreground text-sm">
                                    {summary}
                                </p>
                            </div>
                            <NewInvoiceButton />
                        </div>
                        <DataTable {...tableProps} frame="panel" />
                    </Option>

                    {/* 5 — Sections : blocs séparés par des traits, tableau à plat */}
                    <Option label="Sections à plat" hidden>
                        <div className="flex items-center justify-between border-b py-6">
                            <div>
                                <h1 className="text-lg font-medium">
                                    Factures
                                </h1>
                                <p className="text-muted-foreground text-sm">
                                    {summary}
                                </p>
                            </div>
                            <NewInvoiceButton />
                        </div>
                        <DataTable
                            {...tableProps}
                            frame="flat"
                            className="-mx-4 px-4"
                        />
                    </Option>
                </div>
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
