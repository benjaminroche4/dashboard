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
import { VisitModeBadge } from '@/components/visits/visit-mode-badge';
import { VisitReportBadge } from '@/components/visits/visit-report-badge';
import { PropertyThumb } from '@/components/visits/property-picker';
import { VisitRowActions } from '@/components/visits/visit-row-actions';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { timeFormat, type VisitDay } from '@/lib/visits';
import { show as agentShow } from '@/routes/agents';
import { show as clientShow } from '@/routes/clients';
import { show as visitShow } from '@/routes/clients/visits';

/** Un jour de visites : en-tête daté et tableau des visites, par heure. */
export function VisitDaySection({ day }: { day: VisitDay }) {
    const title = day.relative ? `${day.relative} · ${day.label}` : day.label;

    return (
        <section
            aria-label={title}
            data-day={day.key}
            className={cn('grid grid-cols-1 gap-3', day.past && 'opacity-80')}
        >
            {/* Même cadre que les Data Tables du backoffice : panneau gris,
                tableau blanc à l'intérieur. La date vit dans la partie grise. */}
            <div className="bg-sidebar grid gap-3 rounded-xl border p-3">
                <header className="flex flex-wrap items-baseline gap-2 px-1">
                    <h2 className="text-base font-medium first-letter:uppercase">
                        {title}
                    </h2>
                    <span className="text-muted-foreground text-sm tabular-nums">
                        {day.visits.length} visite
                        {day.visits.length > 1 ? 's' : ''}
                    </span>
                </header>
                <div className="bg-background overflow-hidden rounded-lg border">
                    {/* Largeurs fixes : les tableaux de chaque journée s'alignent entre eux. */}
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">Heure</TableHead>
                                <TableHead className="w-[22%]">
                                    Client
                                </TableHead>
                                <TableHead className="w-[34%]">Bien</TableHead>
                                <TableHead className="w-[13%]">
                                    Réalisée par
                                </TableHead>
                                <TableHead className="w-[15%]">
                                    Statut
                                </TableHead>
                                <TableHead className="w-[10%]">Agent</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {day.visits.map((visit) => (
                                <TableRow key={visit.id} className="align-top">
                                    <TableCell className="font-medium whitespace-nowrap tabular-nums">
                                        {/* L'heure mène à la fiche de la visite. */}
                                        <Link
                                            href={visitShow({
                                                visit: visit.uuid,
                                            })}
                                            aria-label={`Fiche de la visite de ${visit.client.name}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {timeFormat.format(
                                                new Date(visit.scheduled_at),
                                            )}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <div className="grid min-w-0">
                                            <Link
                                                href={clientShow({
                                                    lead: visit.client.uuid,
                                                })}
                                                className="truncate font-medium underline-offset-4 hover:underline"
                                            >
                                                {visit.client.name}
                                            </Link>
                                            {visit.client.reference && (
                                                <span className="text-muted-foreground truncate text-xs tabular-nums">
                                                    {visit.client.reference}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {/* La photo du bien précède son nom. */}
                                        <div className="flex min-w-0 items-center gap-2 text-sm">
                                            <PropertyThumb
                                                photo={visit.property.photo}
                                                label={visit.property.label}
                                            />
                                            <div className="grid min-w-0">
                                                <span className="truncate font-medium">
                                                    {visit.property.label}
                                                </span>
                                                <span className="text-muted-foreground truncate text-xs">
                                                    {formatAddress(
                                                        visit.property,
                                                    ) ?? '—'}
                                                    {visit.property
                                                        .rent_cents !== null &&
                                                        ` · ${formatMoney(visit.property.rent_cents, visit.property.currency)} / mois`}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <VisitModeBadge mode={visit.mode} />
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
                                                className="block truncate text-sm underline-offset-4 hover:underline"
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
            </div>
        </section>
    );
}
