import { Link } from '@inertiajs/react';
import { CalendarDays, UserRound } from 'lucide-react';
import { leadStatusClasses } from '@/components/leads/lead-status-menu';
import { OfferBadge } from '@/components/clients/offer-badge';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { show as clientShow } from '@/routes/clients';
import { show as leadShow } from '@/routes/leads';
import type { AgentLead } from '@/types';

/**
 * Une ligne « lead ou client » de l'annuaire : un lead converti porte le nom de
 * son foyer, un badge « Client » et mène à son dossier ; un lead en cours mène
 * à sa fiche, son statut rappelé en gris.
 */
export function AgentLeadLink({
    lead,
    status = true,
}: {
    lead: AgentLead;
    /** Faux quand la ligne détaillée porte déjà le statut en badge. */
    status?: boolean;
}) {
    return (
        <>
            <Link
                href={
                    lead.is_client
                        ? clientShow({ lead: lead.uuid })
                        : leadShow({ lead: lead.uuid })
                }
                className="truncate font-medium underline-offset-4 hover:underline"
            >
                {lead.name}
            </Link>
            {lead.is_client ? (
                <Badge
                    variant="secondary"
                    className="shrink-0 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                >
                    Client
                </Badge>
            ) : (
                status && (
                    <span className="text-muted-foreground shrink-0 text-xs">
                        {lead.status_label}
                    </span>
                )
            )}
        </>
    );
}

/**
 * La même ligne, avec son contexte, sur la fiche d'un agent (28 octobre 2026 :
 * un nom et « Client » ne disaient pas de quoi il s'agissait) : le statut en
 * badge teinté, puis référence, formule, budget, arrivée et suivi par en
 * seconde ligne grise ; ce qui manque n'est pas écrit (pas de dernier contact :
 * retiré le 28 octobre 2026, il se lit sur la fiche du lead).
 */
export function AgentLeadRow({ lead }: { lead: AgentLead }) {
    const details: { key: string; node: React.ReactNode }[] = [];

    if (lead.reference) {
        details.push({
            key: 'reference',
            node: <span className="tabular-nums">{lead.reference}</span>,
        });
    }
    if (lead.offer && lead.offer_label) {
        details.push({
            key: 'offer',
            node: <OfferBadge offer={lead.offer} label={lead.offer_label} />,
        });
    }
    if (lead.budget_cents) {
        details.push({
            key: 'budget',
            node: (
                <span className="tabular-nums">
                    {formatMoney(lead.budget_cents, lead.currency ?? 'EUR')} /
                    mois
                </span>
            ),
        });
    }
    if (lead.arrival_at) {
        details.push({
            key: 'arrival',
            node: (
                <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" aria-hidden />
                    Arrivée le {formatDate(lead.arrival_at)}
                </span>
            ),
        });
    }
    if (lead.assignee) {
        details.push({
            key: 'assignee',
            node: (
                <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3" aria-hidden />
                    Suivi par {lead.assignee.name}
                </span>
            ),
        });
    }

    return (
        <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
                <AgentLeadLink lead={lead} status={!lead.status} />
                {lead.status && !lead.is_client && (
                    <Badge
                        variant="secondary"
                        className={cn(
                            'font-medium',
                            leadStatusClasses[lead.status],
                        )}
                    >
                        {lead.status_label}
                    </Badge>
                )}
            </div>
            {details.length > 0 && (
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {details.map((detail) => (
                        <span
                            key={detail.key}
                            className="inline-flex items-center"
                        >
                            {detail.node}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
