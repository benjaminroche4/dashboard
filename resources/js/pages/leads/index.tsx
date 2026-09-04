import { Head, Link } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LeadKanban } from '@/components/leads/kanban-board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import type { Lead, LeadStatusOption } from '@/types';

type Props = {
    leads: Lead[];
    statuses: LeadStatusOption[];
};

export default function LeadsIndex({ leads, statuses }: Props) {
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return needle === ''
            ? leads
            : leads.filter((lead) =>
                  [lead.name, lead.email, lead.phone, lead.origin_city]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase()
                      .includes(needle),
              );
    }, [leads, query]);

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
                <div className="pb-4">
                    <Input
                        aria-label="Filtrer les leads"
                        placeholder="Filtrer par nom, e-mail, téléphone ou ville…"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="bg-background max-w-sm"
                    />
                </div>
                <LeadKanban leads={filtered} statuses={statuses} />
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
