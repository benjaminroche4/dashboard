import { Head, Link } from '@inertiajs/react';
import {
    CalendarClock,
    FileCheck2,
    Hourglass,
    NotebookPen,
    PhoneCall,
    Route,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TodayVisits } from '@/components/dashboard/today-visits';
import { FirstContactBadge } from '@/components/leads/first-contact-badge';
import { DetailSection } from '@/components/real-estate/detail-header';
import { Badge } from '@/components/ui/badge';
import { WriteReportButton } from '@/components/visits/write-report-button';
import { useNow } from '@/hooks/use-now';
import { parisFormat } from '@/lib/datetime';
import { firstContactTimer } from '@/lib/lead-urgency';
import { timeFormat } from '@/lib/visits';
import { dashboard } from '@/routes';
import { show as clientShow, visits as visitsIndex } from '@/routes/clients';
import { show as visitShow } from '@/routes/clients/visits';
import { show as leadShow } from '@/routes/leads';
import { show as propertyShow } from '@/routes/properties';
import { show as documentShow } from '@/routes/tools/documents';
import type { Lead, Today, TodayBlock } from '@/types';

type Props = { today: Today };

const longDate = parisFormat({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
});
const shortDate = parisFormat({ day: 'numeric', month: 'short' });

/** Un bloc avec le total réel, même quand la liste est tronquée. */
function Section<T>({
    icon: Icon,
    title,
    block,
    empty,
    children,
}: {
    icon: LucideIcon;
    title: string;
    block: TodayBlock<T>;
    empty: string;
    children: (items: T[]) => React.ReactNode;
}) {
    return (
        <DetailSection
            title={title}
            count={block.total}
            action={
                <Icon className="text-muted-foreground size-4" aria-hidden />
            }
        >
            {block.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">{empty}</p>
            ) : (
                children(block.items)
            )}
        </DetailSection>
    );
}

/** Un lead sur une ligne : nom en lien, référence, et ce qui presse à droite. */
function LeadLine({
    lead,
    trailing,
}: {
    lead: Lead;
    trailing?: React.ReactNode;
}) {
    return (
        <li className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
            <span className="grid min-w-0 gap-0.5">
                <Link
                    href={leadShow({ lead: lead.uuid })}
                    className="truncate font-medium underline-offset-4 hover:underline"
                >
                    {lead.name}
                </Link>
                <span className="text-muted-foreground text-xs">
                    {lead.reference}
                    {lead.company && ` · ${lead.company}`}
                </span>
            </span>
            {trailing}
        </li>
    );
}

/**
 * « Aujourd'hui » : la page d'arrivée dit à chaque membre ce qu'il a à faire
 * maintenant — sa tournée, ses comptes rendus, les leads qui attendent un
 * premier contact, ses recontacts, les décisions et les pièces en attente.
 * Un bloc absent est une section fermée pour ce membre ; tout vide, la page
 * le dit franchement.
 */
export default function Dashboard({ today }: Props) {
    const now = useNow(1_000);
    const blocks = [
        today.visits,
        today.reports_due,
        today.first_contacts,
        today.recontacts,
        today.decisions,
        today.documents_to_review,
    ];
    const nothing = blocks.every(
        (block) =>
            block === null ||
            (Array.isArray(block) ? block.length === 0 : block.total === 0),
    );

    return (
        <>
            <Head title="Aujourd’hui" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-10">
                <div className="pt-8">
                    <h1 className="text-lg font-medium">Aujourd’hui</h1>
                    <p className="text-muted-foreground text-sm first-letter:uppercase">
                        {longDate.format(now)}
                    </p>
                </div>

                {nothing && (
                    <p
                        role="status"
                        className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm"
                    >
                        Rien ne vous attend pour l’instant.
                    </p>
                )}

                <div className="grid items-start gap-4 lg:grid-cols-2">
                    {today.visits !== null && (
                        <DetailSection
                            title="Ma tournée"
                            count={today.visits.length}
                            action={
                                <Link
                                    href={visitsIndex()}
                                    className="text-muted-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                                >
                                    <Route className="size-3.5" aria-hidden />
                                    Toutes les visites
                                </Link>
                            }
                        >
                            <TodayVisits visits={today.visits} />
                        </DetailSection>
                    )}

                    {today.reports_due !== null && (
                        <Section
                            icon={NotebookPen}
                            title="Comptes rendus à rédiger"
                            block={today.reports_due}
                            empty="Tout est rédigé."
                        >
                            {(visits) => (
                                <ul
                                    role="list"
                                    className="divide-border grid divide-y"
                                >
                                    {visits.map((visit) => (
                                        <li
                                            key={visit.uuid}
                                            className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                                        >
                                            <span className="grid min-w-0 gap-0.5">
                                                <Link
                                                    href={visitShow({
                                                        visit: visit.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {visit.client.name}
                                                </Link>
                                                <span className="text-muted-foreground text-xs">
                                                    {shortDate.format(
                                                        new Date(
                                                            visit.scheduled_at,
                                                        ),
                                                    )}
                                                    {' · '}
                                                    {timeFormat.format(
                                                        new Date(
                                                            visit.scheduled_at,
                                                        ),
                                                    )}
                                                    {' · '}
                                                    {visit.property.label}
                                                </span>
                                            </span>
                                            <WriteReportButton visit={visit} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}

                    {today.first_contacts !== null && (
                        <Section
                            icon={PhoneCall}
                            title="Premier contact à faire"
                            block={today.first_contacts}
                            empty="Aucun lead n’attend un premier contact."
                        >
                            {(leads) => (
                                <ul
                                    role="list"
                                    className="divide-border grid divide-y"
                                >
                                    {leads.map((lead) => (
                                        <LeadLine
                                            key={lead.uuid}
                                            lead={lead}
                                            trailing={
                                                <FirstContactBadge
                                                    timer={firstContactTimer(
                                                        lead,
                                                        now,
                                                    )}
                                                />
                                            }
                                        />
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}

                    {today.recontacts !== null && (
                        <Section
                            icon={CalendarClock}
                            title="Recontacts du jour"
                            block={today.recontacts}
                            empty="Aucun recontact prévu aujourd’hui."
                        >
                            {(leads) => (
                                <ul
                                    role="list"
                                    className="divide-border grid divide-y"
                                >
                                    {leads.map((lead) => (
                                        <LeadLine
                                            key={lead.uuid}
                                            lead={lead}
                                            trailing={
                                                lead.recontact_at && (
                                                    <Badge
                                                        variant="outline"
                                                        className="tabular-nums"
                                                    >
                                                        {shortDate.format(
                                                            new Date(
                                                                lead.recontact_at,
                                                            ),
                                                        )}
                                                    </Badge>
                                                )
                                            }
                                        />
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}

                    {today.decisions !== null && (
                        <Section
                            icon={Hourglass}
                            title="Décisions attendues"
                            block={today.decisions}
                            empty="Aucun bien en attente de décision."
                        >
                            {(decisions) => (
                                <ul
                                    role="list"
                                    className="divide-border grid divide-y"
                                >
                                    {decisions.map((decision) => (
                                        <li
                                            key={`${decision.lead.uuid}-${decision.property.uuid}`}
                                            className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                                        >
                                            <span className="grid min-w-0 gap-0.5">
                                                <Link
                                                    href={clientShow({
                                                        lead: decision.lead
                                                            .uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {decision.lead.name}
                                                </Link>
                                                <Link
                                                    href={propertyShow({
                                                        property:
                                                            decision.property
                                                                .uuid,
                                                    })}
                                                    className="text-muted-foreground truncate text-xs underline-offset-4 hover:underline"
                                                >
                                                    {decision.property.label}
                                                </Link>
                                            </span>
                                            {decision.due && (
                                                <Badge className="border-transparent bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200">
                                                    À relancer
                                                </Badge>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}

                    {today.documents_to_review !== null && (
                        <Section
                            icon={FileCheck2}
                            title="Pièces relues par l’assistant"
                            block={today.documents_to_review}
                            empty="Aucune pièce n’attend votre décision."
                        >
                            {(requests) => (
                                <ul
                                    role="list"
                                    className="divide-border grid divide-y"
                                >
                                    {requests.map((request) => (
                                        <li
                                            key={request.uuid}
                                            className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                                        >
                                            <Link
                                                href={documentShow({
                                                    documentRequest:
                                                        request.uuid,
                                                })}
                                                className="truncate font-medium underline-offset-4 hover:underline"
                                            >
                                                {request.name}
                                            </Link>
                                            <Badge
                                                variant="secondary"
                                                className="tabular-nums"
                                            >
                                                {request.count} à relire
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Aujourd’hui', href: dashboard() }],
};
