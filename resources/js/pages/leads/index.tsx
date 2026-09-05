import { Head, Link } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LeadKanban } from '@/components/leads/kanban-board';
import { LeadFilterBar } from '@/components/leads/lead-filter-bar';
import { LeadPreviewSheet } from '@/components/leads/lead-preview-sheet';
import { Button } from '@/components/ui/button';
import { defaultFilters, filterLeads, type LeadFilters } from '@/lib/kanban';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import type { Lead, LeadOfferOption, LeadStatusOption } from '@/types';

type Props = {
    leads: Lead[];
    statuses: LeadStatusOption[];
    offers: LeadOfferOption[];
};

export default function LeadsIndex({ leads, statuses, offers }: Props) {
    const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
    const [previewId, setPreviewId] = useState<number | null>(null);
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
            <div className="flex w-full flex-1 flex-col px-4 pb-6">
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Leads</h1>
                        <p className="text-muted-foreground text-sm">
                            {summary}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={leadsCreate()}>
                            <Sparkles />
                            Converting Machine
                        </Link>
                    </Button>
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
                        <LeadKanban
                            leads={filtered}
                            statuses={statuses}
                            reorderable={filters.sort === 'manual'}
                            onOpen={(lead) => setPreviewId(lead.id)}
                        />
                        <LeadPreviewSheet
                            leadId={previewId}
                            statuses={statuses}
                            onOpenChange={(open) => {
                                if (!open) {
                                    setPreviewId(null);
                                }
                            }}
                        />
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
