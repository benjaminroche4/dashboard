import { Head, Link } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { OwnerLeadKanban } from '@/components/owners/lead-kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { filterOwnerLeads } from '@/lib/owner-kanban';
import { index as ownersIndex, leads as ownersLeads } from '@/routes/owners';
import type {
    LabeledOption,
    LeadLossReason,
    LeadStatusOption,
    OwnerLead,
} from '@/types';

type Props = {
    leads: OwnerLead[];
    statuses: LeadStatusOption[];
    lossReasons: LabeledOption<LeadLossReason>[];
};

/** Leads propriétaires en kanban : demandes de gestion locative reçues du site ou créées depuis un propriétaire prospecté. */
export default function OwnerLeads({ leads, statuses, lossReasons }: Props) {
    const [query, setQuery] = useState('');
    const todo = leads.filter((lead) => lead.status === 'todo').length;
    const visible = filterOwnerLeads(leads, query);

    return (
        <>
            <Head title="Leads propriétaires" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            Leads propriétaires
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {leads.length} demande(s) de gestion locative
                            {todo > 0 && ` · ${todo} à traiter`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                                aria-hidden
                            />
                            <Input
                                aria-label="Filtrer les leads"
                                placeholder="Filtrer par nom, société…"
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                className="w-56 pl-8"
                            />
                        </div>
                        <Button variant="outline" asChild>
                            <Link href={ownersIndex()}>
                                <Plus />
                                Prospecter un propriétaire
                            </Link>
                        </Button>
                    </div>
                </div>
                <OwnerLeadKanban
                    leads={visible}
                    statuses={statuses}
                    lossReasons={lossReasons}
                />
            </div>
        </>
    );
}

OwnerLeads.layout = {
    breadcrumbs: [
        { title: 'Propriétaires', href: ownersLeads() },
        { title: 'Liste des leads', href: ownersLeads() },
    ],
};
