import { Head, Link } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { LeadListView } from '@/components/leads/lead-list-view';
import { Button } from '@/components/ui/button';
import { create as leadsCreate, index as leadsIndex } from '@/routes/leads';
import type {
    ArchivedLeads,
    LabeledOption,
    Lead,
    LeadLossReason,
    LeadOfferOption,
    LeadStatusOption,
} from '@/types';

type Props = {
    leads: Lead[];
    archived: ArchivedLeads;
    statuses: LeadStatusOption[];
    offers: LeadOfferOption[];
    lossReasons: LabeledOption<LeadLossReason>[];
};

export default function LeadsIndex({
    leads,
    archived,
    statuses,
    offers,
    lossReasons,
}: Props) {
    const open = leads.filter(
        (lead) => lead.status !== 'converted' && lead.status !== 'archived',
    ).length;
    const converted = leads.filter(
        (lead) => lead.status === 'converted',
    ).length;

    return (
        <>
            <Head title="Leads" />
            <LeadListView
                leads={leads}
                archived={archived}
                statuses={statuses}
                offers={offers}
                lossReasons={lossReasons}
                title="Leads"
                summary={`${leads.length + (archived.loaded ? 0 : archived.count)} lead(s) · ${open} en cours · ${converted} converti(s)`}
                storageKey="leads.view"
                action={
                    <Button asChild>
                        <Link href={leadsCreate()}>
                            <Sparkles />
                            Converting Machine
                        </Link>
                    </Button>
                }
                empty={{
                    icon: <Sparkles className="text-muted-foreground size-5" />,
                    title: 'Aucun lead pour le moment',
                    description:
                        'Ajoutez votre premier prospect avec la Converting Machine : il apparaîtra ici dans la colonne « À traiter ».',
                    href: leadsCreate(),
                    label: 'Ouvrir la Converting Machine',
                }}
            />
        </>
    );
}

LeadsIndex.layout = {
    breadcrumbs: [
        { title: 'Leads', href: leadsIndex() },
        { title: 'Kanban', href: leadsIndex() },
    ],
};
