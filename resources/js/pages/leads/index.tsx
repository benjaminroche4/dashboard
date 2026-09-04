import { Head, Link } from '@inertiajs/react';
import { Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LeadKanban } from '@/components/leads/kanban-board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { defaultFilters, filterLeads, type LeadFilters } from '@/lib/kanban';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import type {
    Lead,
    LeadOfferOption,
    LeadSortKey,
    LeadStatusOption,
    OfferValue,
} from '@/types';

type Props = {
    leads: Lead[];
    statuses: LeadStatusOption[];
    offers: LeadOfferOption[];
};

const sortOptions: { value: LeadSortKey; label: string }[] = [
    { value: 'manual', label: 'Ordre manuel' },
    { value: 'score', label: 'Meilleure note' },
    { value: 'arrival', label: "Date d'arrivée" },
    { value: 'created', label: 'Plus récents' },
];

export default function LeadsIndex({ leads, statuses, offers }: Props) {
    const [filters, setFilters] = useState<LeadFilters>(defaultFilters);
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
                        <div className="flex flex-wrap items-center gap-2 pb-4">
                            <Input
                                aria-label="Filtrer les leads"
                                placeholder="Nom, e-mail, téléphone ou ville…"
                                value={filters.query}
                                onChange={(event) =>
                                    patch({ query: event.target.value })
                                }
                                className="bg-background w-full sm:max-w-xs"
                            />
                            <Select
                                value={filters.offer}
                                onValueChange={(value) =>
                                    patch({
                                        offer: value as OfferValue | 'all',
                                    })
                                }
                            >
                                <SelectTrigger
                                    aria-label="Offre"
                                    className="bg-background w-40"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Toutes les offres
                                    </SelectItem>
                                    {offers.map((offer) => (
                                        <SelectItem
                                            key={offer.value}
                                            value={offer.value}
                                        >
                                            {offer.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={String(filters.minScore)}
                                onValueChange={(value) =>
                                    patch({ minScore: Number(value) })
                                }
                            >
                                <SelectTrigger
                                    aria-label="Note minimale"
                                    className="bg-background w-36"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">
                                        Toutes les notes
                                    </SelectItem>
                                    {[5, 4, 3, 2].map((score) => (
                                        <SelectItem
                                            key={score}
                                            value={String(score)}
                                        >
                                            <Star className="size-3.5 fill-current text-amber-500" />
                                            {score} et plus
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.sort}
                                onValueChange={(value) =>
                                    patch({ sort: value as LeadSortKey })
                                }
                            >
                                <SelectTrigger
                                    aria-label="Tri"
                                    className="bg-background w-40"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortOptions.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {filters !== defaultFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFilters(defaultFilters)}
                                >
                                    Réinitialiser
                                </Button>
                            )}
                        </div>
                        <LeadKanban
                            leads={filtered}
                            statuses={statuses}
                            reorderable={filters.sort === 'manual'}
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
