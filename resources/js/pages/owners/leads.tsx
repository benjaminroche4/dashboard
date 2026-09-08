import { Head, Link } from '@inertiajs/react';
import { Building2, Plus } from 'lucide-react';
import { LeadListView } from '@/components/leads/lead-list-view';
import { Button } from '@/components/ui/button';
import { index as ownersIndex, leads as ownersLeads } from '@/routes/owners';
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

/** Leads propriétaires (demandes de gestion locative) : exactement la même vue que la liste des leads. */
export default function OwnerLeads({
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
            <Head title="Leads propriétaires" />
            <LeadListView
                leads={leads}
                archived={archived}
                statuses={statuses}
                offers={offers}
                lossReasons={lossReasons}
                title="Leads propriétaires"
                summary={`${leads.length + (archived.loaded ? 0 : archived.count)} lead(s) · ${open} en cours · ${converted} converti(s)`}
                storageKey="owners.leads.view"
                palette="owner"
                action={
                    <Button asChild>
                        <Link href={ownersIndex()}>
                            <Plus />
                            Prospecter un propriétaire
                        </Link>
                    </Button>
                }
                empty={{
                    icon: (
                        <Building2 className="text-muted-foreground size-5" />
                    ),
                    title: 'Aucun lead propriétaire pour le moment',
                    description:
                        'Les demandes de gestion locative reçues du site et les propriétaires convertis apparaîtront ici dans la colonne « À traiter ».',
                    href: ownersIndex(),
                    label: 'Prospecter un propriétaire',
                }}
            />
        </>
    );
}

OwnerLeads.layout = {
    breadcrumbs: [
        { title: 'Propriétaires', href: ownersLeads() },
        { title: 'Liste des leads', href: ownersLeads() },
    ],
};
