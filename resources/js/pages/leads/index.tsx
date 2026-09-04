import { Head, Link } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table';
import { leadColumnLabels, leadColumns } from '@/components/leads/columns';
import { Button } from '@/components/ui/button';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import type { Lead, LeadStatusOption } from '@/types';

type Props = {
    leads: Lead[];
    statuses: LeadStatusOption[];
};

export default function LeadsIndex({ leads, statuses }: Props) {
    const columns = useMemo(() => leadColumns(statuses), [statuses]);
    const open = leads.filter(
        (lead) => lead.status !== 'converted' && lead.status !== 'lost',
    ).length;
    const converted = leads.filter(
        (lead) => lead.status === 'converted',
    ).length;
    const summary = `${leads.length} lead(s) · ${open} en cours · ${converted} converti(s)`;

    return (
        <>
            <Head title="Leads" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
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
                <DataTable
                    columns={columns}
                    data={leads}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par nom…"
                    columnLabels={leadColumnLabels}
                    frame="panel"
                />
            </div>
        </>
    );
}

LeadsIndex.layout = {
    breadcrumbs: [
        { title: 'Leads', href: leadsIndex() },
        { title: 'Liste', href: leadsIndex() },
    ],
};
