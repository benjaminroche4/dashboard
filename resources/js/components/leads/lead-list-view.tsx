import { Link, router } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { Kanban, Table2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { DataTable } from '@/components/data-table';
import {
    LeadKanban,
    type KanbanPalette,
} from '@/components/leads/kanban-board';
import { LeadFilterBar } from '@/components/leads/lead-filter-bar';
import {
    leadTableColumnLabels,
    leadTableColumns,
} from '@/components/leads/lead-table-columns';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    defaultFilters,
    filterLeads,
    type LeadFilters,
    hasActiveFilters,
} from '@/lib/kanban';
import { cn } from '@/lib/utils';
import { show as leadShow } from '@/routes/leads';
import type {
    ArchivedLeads,
    LabeledOption,
    Lead,
    LeadLossReason,
    LeadOfferOption,
    LeadStatusOption,
} from '@/types';

export type LeadView = 'kanban' | 'table';

/** Vue choisie par l'utilisateur, mémorisée entre deux visites sous `storageKey`. */
function readView(storageKey: string): LeadView {
    try {
        return localStorage.getItem(storageKey) === 'table'
            ? 'table'
            : 'kanban';
    } catch {
        return 'kanban';
    }
}

function storeView(storageKey: string, view: LeadView): void {
    try {
        localStorage.setItem(storageKey, view);
    } catch {
        // Stockage indisponible : la vue reste en mémoire.
    }
}

type Props = {
    leads: Lead[];
    /** Archivés non chargés par défaut : chargés à la demande via `?archived=1`. */
    archived?: ArchivedLeads;
    statuses: LeadStatusOption[];
    offers: LeadOfferOption[];
    lossReasons: LabeledOption<LeadLossReason>[];
    title: string;
    /** Sous-titre calculé à partir des leads reçus. */
    summary: string;
    /** Clé `localStorage` du choix Kanban / Tableau. */
    storageKey: string;
    /** Couleurs des colonnes du kanban (locataires par défaut). */
    palette?: KanbanPalette;
    /** Bouton principal à droite du sélecteur d'affichage. */
    action: ReactNode;
    /** État vide : icône, titre, texte et lien. */
    empty: {
        icon: ReactNode;
        title: string;
        description: string;
        href: ComponentProps<typeof Link>['href'];
        label: string;
    };
};

/**
 * Liste de leads en kanban ou en tableau (même vue pour les leads locataires et propriétaires) :
 * sélecteur d'affichage mémorisé, barre de filtres, kanban avec ordre manuel ou Data Table.
 */
export function LeadListView({
    leads,
    archived,
    statuses,
    offers,
    lossReasons,
    title,
    summary,
    storageKey,
    palette = 'tenant',
    action,
    empty,
}: Props) {
    const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
    const [view, setView] = useState<LeadView>(() => readView(storageKey));
    const changeView = (next: LeadView) => {
        setView(next);
        storeView(storageKey, next);

        // Le filtre par statut n'a de sens qu'en tableau : le kanban a une colonne par statut.
        if (next === 'kanban') {
            setFilters((current) => ({ ...current, status: 'all' }));
        }
    };
    const filtered = useMemo(
        () => filterLeads(leads, filters),
        [leads, filters],
    );
    // Sous filtre, la liste est partielle : une position calculée dessus serait
    // fausse sur la colonne complète, le glisser change alors seulement le statut.
    const filtering = hasActiveFilters(filters);
    const loadArchived = () =>
        router.reload({ data: { archived: 1 }, only: ['leads', 'archived'] });
    const patch = (changes: Partial<LeadFilters>) => {
        // Filtrer le tableau sur « Archivé » charge les archivés s'ils ne le sont pas encore.
        if (changes.status === 'archived' && archived && !archived.loaded) {
            loadArchived();
        }

        setFilters((current) => ({ ...current, ...changes }));
    };

    return (
        <div
            className={cn(
                'flex w-full flex-1 flex-col px-4',
                // En tableau, même gabarit centré que les dossiers clients ; le kanban garde toute la largeur.
                view === 'table' ? 'mx-auto max-w-7xl pb-10' : 'pb-6',
            )}
        >
            <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                <div>
                    <h1 className="text-lg font-medium">{title}</h1>
                    <p className="text-muted-foreground text-sm">{summary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                    {action}
                </div>
            </div>

            {leads.length === 0 ? (
                <div className="bg-sidebar flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
                    <span className="bg-background flex size-12 items-center justify-center rounded-full border">
                        {empty.icon}
                    </span>
                    <h2 className="text-base font-medium">{empty.title}</h2>
                    <p className="text-muted-foreground max-w-sm text-sm">
                        {empty.description}
                    </p>
                    <Button asChild variant="outline">
                        <Link href={empty.href}>{empty.label}</Link>
                    </Button>
                </div>
            ) : (
                <>
                    <LeadFilterBar
                        filters={filters}
                        offers={offers}
                        statuses={view === 'table' ? statuses : undefined}
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
                            reorderable={
                                filters.sort === 'manual' && !filtering
                            }
                            lossReasons={lossReasons}
                            palette={palette}
                            archived={archived}
                            onLoadArchived={loadArchived}
                            onOpen={(lead) =>
                                router.visit(leadShow({ lead: lead.uuid }).url)
                            }
                        />
                    )}
                </>
            )}
        </div>
    );
}
