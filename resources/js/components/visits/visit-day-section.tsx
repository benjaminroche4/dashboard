import { Link } from '@inertiajs/react';
import { formatAddress } from '@/components/real-estate/columns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { VisitRowActions } from '@/components/visits/visit-row-actions';
import { VisitReportBadge } from '@/components/visits/visit-report-badge';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { timeFormat, type VisitDay } from '@/lib/visits';
import { show as agentShow } from '@/routes/agents';
import { show as clientShow } from '@/routes/clients';

/** Un jour de visites : en-tête daté et tableau des visites, par heure. */
export function VisitDaySection({ day }: { day: VisitDay }) {
    const title = day.relative ? `${day.relative} · ${day.label}` : day.label;

    return (
        <section
            aria-label={title}
            data-day={day.key}
            className={cn('grid grid-cols-1 gap-3', day.past && 'opacity-80')}
        >
            <header className="flex items-baseline gap-2">
                <h2 className="text-base font-medium first-letter:uppercase">
                    {title}
                </h2>
                <span className="text-muted-foreground text-sm tabular-nums">
                    {day.visits.length} visite{day.visits.length > 1 ? 's' : ''}
                </span>
            </header>
            <div className="bg-sidebar rounded-xl border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-20">Heure</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Bien</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Agent</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {day.visits.map((visit) => (
                            <TableRow key={visit.id}>
                                <TableCell className="font-medium tabular-nums">
                                    {timeFormat.format(
                                        new Date(visit.scheduled_at),
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="grid">
                                        <Link
                                            href={clientShow({
                                                lead: visit.client.uuid,
                                            })}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            {visit.client.name}
                                        </Link>
                                        {visit.client.reference && (
                                            <span className="text-muted-foreground text-xs">
                                                {visit.client.reference}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="grid text-sm">
                                        <span className="font-medium">
                                            {visit.property.label}
                                        </span>
                                        <span className="text-muted-foreground truncate text-xs">
                                            {formatAddress(visit.property) ??
                                                '—'}
                                            {visit.property.rent_cents !==
                                                null &&
                                                ` · ${formatMoney(visit.property.rent_cents, visit.property.currency)} / mois`}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap items-center gap-1">
                                        <VisitStatusBadge
                                            status={visit.status}
                                            label={visit.status_label}
                                        />
                                        <VisitReportBadge visit={visit} />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {visit.agent ? (
                                        <Link
                                            href={agentShow({
                                                agent: visit.agent.uuid,
                                            })}
                                            className="text-sm underline-offset-4 hover:underline"
                                        >
                                            {visit.agent.name}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <VisitRowActions visit={visit} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </section>
    );
}
