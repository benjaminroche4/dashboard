import { Head, Link, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { QuoteBulkActions } from '@/components/quotes/quote-bulk-actions';
import { quoteColumnLabels, quoteColumns } from '@/components/quotes/columns';
import { Button } from '@/components/ui/button';
import { index as toolsIndex } from '@/routes/tools';
import {
    create as quotesCreate,
    index as quotesIndex,
} from '@/routes/tools/quotes';
import type { Quote } from '@/types';

type Props = {
    quotes: Quote[];
    statuses: { value: string; label: string }[];
};

export default function QuotesIndex({ quotes }: Props) {
    const { auth } = usePage().props;
    // Les membres consultent seulement : pas de création ni d'action de statut.
    const canManage = auth.user.role !== 'member';
    const pending = quotes.filter((quote) => quote.status === 'sent').length;
    const accepted = quotes.filter(
        (quote) => quote.status === 'accepted',
    ).length;
    const summary = [
        `${quotes.length} devis`,
        pending > 0 ? `${pending} en attente` : null,
        accepted > 0 ? `${accepted} à facturer` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <>
            <Head title="Devis" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Devis</h1>
                        <p className="text-muted-foreground text-sm">
                            {summary}
                        </p>
                    </div>
                    {canManage && (
                        <Button asChild>
                            <Link href={quotesCreate()}>
                                <Plus />
                                Nouveau devis
                            </Link>
                        </Button>
                    )}
                </div>
                <DataTable
                    columns={quoteColumns(canManage)}
                    data={quotes}
                    filterColumn="client_name"
                    filterPlaceholder="Filtrer par client…"
                    columnLabels={quoteColumnLabels}
                    frame="panel"
                    bulkActions={
                        canManage
                            ? (rows, clear) => (
                                  <QuoteBulkActions
                                      quotes={rows}
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

QuotesIndex.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Devis', href: quotesIndex() },
    ],
};
