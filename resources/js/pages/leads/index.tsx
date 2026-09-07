import { Head, Link, router } from '@inertiajs/react';
import { Kanban, Sparkles, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { LeadKanban } from '@/components/leads/kanban-board';
import {
    leadTableColumnLabels,
    leadTableColumns,
} from '@/components/leads/lead-table-columns';
import { LeadFilterBar } from '@/components/leads/lead-filter-bar';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { defaultFilters, filterLeads, type LeadFilters } from '@/lib/kanban';
import { cn } from '@/lib/utils';
import {
    create as leadsCreate,
    index as leadsIndex,
    show as leadShow,
} from '@/routes/leads';
import type {
    LabeledOption,
    Lead,
    LeadLossReason,
    LeadOfferOption,
    LeadStatusOption,
} from '@/types';

type LeadView = 'kanban' | 'table';

const viewStorageKey = 'leads.view';

/** Vue choisie par l'utilisateur, mémorisée entre deux visites. */
function readView(): LeadView {
    try {
        return localStorage.getItem(viewStorageKey) === 'table'
            ? 'table'
            : 'kanban';
    } catch {
        return 'kanban';
    }
}

function storeView(view: LeadView): void {
    try {
        localStorage.setItem(viewStorageKey, view);
    } catch {
        // Stockage indisponible : la vue reste en mémoire.
    }
}

type Props = {
    leads: Lead[];
    statuses: LeadStatusOption[];
    offers: LeadOfferOption[];
    lossReasons: LabeledOption<LeadLossReason>[];
};

export default function LeadsIndex({
    leads,
    statuses,
    offers,
    lossReasons,
}: Props) {
    const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
    const [view, setView] = useState<LeadView>(readView);
    const changeView = (next: LeadView) => {
        setView(next);
        storeView(next);
    };
    const filtered = useMemo(
        () => filterLeads(leads, filters),
        [leads, filters],
    );
    const patch = (changes: Partial<LeadFilters>) =>
        setFilters((current) => ({ ...current, ...changes }));

    const open = leads.filter(
        (lead) => lead.status !== 'converted' && lead.status !== 'archived',
    ).length;
    const converted = leads.filter(
        (lead) => lead.status === 'converted',
    ).length;
    const summary = `${leads.length} lead(s) · ${open} en cours · ${converted} converti(s)`;

    return (
        <>
            <Head title="Leads" />
            <div
                className={cn(
                    'flex w-full flex-1 flex-col px-4',
                    // En tableau, même gabarit centré que les dossiers clients ; le kanban garde toute la largeur.
                    view === 'table' ? 'mx-auto max-w-7xl pb-10' : 'pb-6',
                )}
            >
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Leads</h1>
                        <p className="text-muted-foreground text-sm">
                            {summary}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ToggleGroup
                            type="single"
                            value={view}
                            onValueChange={(value) =>
                                value && changeView(value as LeadView)
                            }
                            aria-label="Affichage"
                            className="gap-1"
                        >
                            <ToggleGroupItem
                                value="kanban"
                                aria-label="Kanban"
                                className="h-9 rounded-md px-3 first:rounded-md last:rounded-md"
                            >
                                <Kanban aria-hidden />
                                Kanban
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="table"
                                aria-label="Tableau"
                                className="h-9 rounded-md px-3 first:rounded-md last:rounded-md"
                            >
                                <Table2 aria-hidden />
                                Tableau
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <Button asChild>
                            <Link href={leadsCreate()}>
                                <Sparkles />
                                Converting Machine
                            </Link>
                        </Button>
                    </div>
                </div>

                {leads.length === 0 ? (
                    <div className="bg-sidebar flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
                        <span className="bg-background flex size-12 items-center justify-center rounded-full border">
                            <Sparkles className="text-muted-foreground size-5" />
                        </span>
                        <h2 className="text-base font-medium">
                            Aucun lead pour le moment
                        </h2>
                        <p className="text-muted-foreground max-w-sm text-sm">
                            Ajoutez votre premier prospect avec la Converting
                            Machine : il apparaîtra ici dans la colonne « À
                            traiter ».
                        </p>
                        <Button asChild variant="outline">
                            <Link href={leadsCreate()}>
                                Ouvrir la Converting Machine
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <LeadFilterBar
                            filters={filters}
                            offers={offers}
                            leads={leads}
                            onChange={patch}
                        />
                        {view === 'table' ? (
                            <DataTable
                                columns={leadTableColumns}
                                data={filtered}
                                filterColumn="name"
                                filterPlaceholder="Filtrer par nom…"
                                columnLabels={leadTableColumnLabels}
                                frame="panel"
                            />
                        ) : (
                            <LeadKanban
                                leads={filtered}
                                statuses={statuses}
                                reorderable={filters.sort === 'manual'}
                                lossReasons={lossReasons}
                                onOpen={(lead) =>
                                    router.visit(
                                        leadShow({ lead: lead.uuid }).url,
                                    )
                                }
                            />
                        )}
                    </>
                )}
            </div>
        </>
    );
}

LeadsIndex.layout = {
    breadcrumbs: [
        { title: 'Leads', href: leadsIndex() },
        { title: 'Kanban', href: leadsIndex() },
    ],
};
