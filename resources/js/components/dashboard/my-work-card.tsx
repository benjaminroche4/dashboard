import { Link, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    ArrowRight,
    CalendarClock,
    PlaneLanding,
} from 'lucide-react';
import { leadStatusClasses } from '@/components/leads/lead-status-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { daysUntil, leadUrgency } from '@/lib/lead-urgency';
import { cn } from '@/lib/utils';
import { index as clientsIndex, show as clientShow } from '@/routes/clients';
import { index as leadsIndex, show as leadShow } from '@/routes/leads';
import { leads as ownerLeadsIndex } from '@/routes/owners';
import type { Lead, MyWork, MyWorkBlock } from '@/types';

type Kind = 'leads' | 'owner_leads' | 'clients';

const sections: { kind: Kind; title: string; all: string; empty: string }[] = [
    {
        kind: 'leads',
        title: 'Mes leads',
        all: 'Tous les leads',
        empty: 'Aucun lead ne vous est attribué.',
    },
    {
        kind: 'owner_leads',
        title: 'Mes leads propriétaires',
        all: 'Tous les leads propriétaires',
        empty: 'Aucun lead propriétaire ne vous est attribué.',
    },
    {
        kind: 'clients',
        title: 'Mes dossiers clients',
        all: 'Tous les dossiers',
        empty: 'Aucun dossier client ne vous est attribué.',
    },
];

function allHref(kind: Kind) {
    return kind === 'clients'
        ? clientsIndex()
        : kind === 'owner_leads'
          ? ownerLeadsIndex()
          : leadsIndex();
}

function itemHref(kind: Kind, lead: Lead) {
    return kind === 'clients'
        ? clientShow({ lead: lead.uuid })
        : leadShow({ lead: lead.uuid });
}

/** Ce qui presse sur une ligne : recontact dû, silence prolongé, arrivée proche. */
function Hint({ lead, now }: { lead: Lead; now: Date }) {
    const urgency = leadUrgency(lead, now);

    if (lead.recontact_at && lead.status !== 'converted') {
        const days = daysUntil(lead.recontact_at, now);
        const late = days < 0;

        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 text-xs',
                    late
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-muted-foreground',
                )}
            >
                <CalendarClock className="size-3" aria-hidden />
                {late
                    ? `Recontact en retard (${formatDate(lead.recontact_at)})`
                    : days === 0
                      ? "Recontact aujourd'hui"
                      : `Recontact le ${formatDate(lead.recontact_at)}`}
            </span>
        );
    }

    if (urgency.contact === 'warn' || urgency.contact === 'late') {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 text-xs',
                    urgency.contact === 'late'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-orange-700 dark:text-orange-300',
                )}
            >
                <AlarmClock className="size-3" aria-hidden />
                Sans contact depuis {urgency.daysSinceContact} j
            </span>
        );
    }

    if (lead.arrival_at) {
        const days = daysUntil(lead.arrival_at, now);

        if (days >= 0 && days <= 30) {
            return (
                <span className="inline-flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300">
                    <PlaneLanding className="size-3" aria-hidden />
                    {days === 0
                        ? "Arrive aujourd'hui"
                        : `Arrive dans ${days} j`}
                </span>
            );
        }
    }

    return null;
}

function Section({
    kind,
    title,
    all,
    empty,
    block,
    now,
}: (typeof sections)[number] & { block: MyWorkBlock; now: Date }) {
    return (
        <section
            aria-label={title}
            className="grid gap-2 py-4 first:pt-0 last:pb-0"
        >
            <header className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                    {title}
                    <Badge
                        variant="secondary"
                        className="font-medium tabular-nums"
                        aria-label={`${block.total} au total`}
                    >
                        {block.total}
                    </Badge>
                </h3>
                <Button variant="ghost" size="sm" className="-mr-2" asChild>
                    <Link href={allHref(kind)}>
                        {all}
                        <ArrowRight aria-hidden />
                    </Link>
                </Button>
            </header>
            {block.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">{empty}</p>
            ) : (
                <ul role="list" className="grid gap-1">
                    {block.items.map((lead) => (
                        <li
                            key={lead.id}
                            className="hover:bg-background flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm"
                        >
                            <div className="grid min-w-0">
                                <Link
                                    href={itemHref(kind, lead)}
                                    className="truncate font-medium underline-offset-4 hover:underline"
                                >
                                    {lead.name}
                                    {lead.company && (
                                        <span className="text-muted-foreground font-normal">
                                            {' '}
                                            · {lead.company}
                                        </span>
                                    )}
                                </Link>
                                <Hint lead={lead} now={now} />
                            </div>
                            <Badge
                                variant="secondary"
                                data-status={lead.status}
                                className={cn(
                                    'shrink-0 font-medium',
                                    leadStatusClasses[lead.status],
                                )}
                            >
                                {lead.status_label}
                            </Badge>
                        </li>
                    ))}
                    {block.total > block.items.length && (
                        <li className="text-muted-foreground px-2 text-xs">
                            et {block.total - block.items.length} autre
                            {block.total - block.items.length > 1 ? 's' : ''}
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
}

/**
 * Carte « Mon travail » du tableau de bord : les leads, leads propriétaires
 * et dossiers clients attribués au membre, chaque bloc n'apparaissant que si
 * sa section lui est ouverte (le serveur renvoie null sinon).
 */
export function MyWorkCard({
    mine,
    now = new Date(),
}: {
    mine: MyWork;
    now?: Date;
}) {
    const { auth } = usePage().props;
    const visible = sections.filter((section) => mine[section.kind] !== null);
    const total = visible.reduce(
        (sum, section) => sum + (mine[section.kind]?.total ?? 0),
        0,
    );

    return (
        <section
            aria-label="Mon travail"
            className="bg-sidebar grid content-start gap-4 rounded-xl border p-4"
        >
            <header className="grid gap-0.5">
                <h2 className="text-base font-medium">Mon travail</h2>
                <p className="text-muted-foreground text-sm">
                    {visible.length === 0
                        ? 'Aucune section ne vous est ouverte.'
                        : `${total} dossier${total > 1 ? 's' : ''} attribué${total > 1 ? 's' : ''} à ${auth.user.name}`}
                </p>
            </header>
            {visible.length > 0 && (
                <div className="divide-y">
                    {visible.map((section) => (
                        <Section
                            key={section.kind}
                            {...section}
                            block={mine[section.kind] as MyWorkBlock}
                            now={now}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
