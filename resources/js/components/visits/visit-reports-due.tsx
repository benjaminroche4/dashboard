import { Link } from '@inertiajs/react';
import { NotebookPen } from 'lucide-react';
import { formatAddress } from '@/components/real-estate/columns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { VisitReportBadge } from '@/components/visits/visit-report-badge';
import { PropertyThumb } from '@/components/visits/property-picker';
import { VisitRowActions } from '@/components/visits/visit-row-actions';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { formatMoney } from '@/lib/format';
import { timeFormat } from '@/lib/visits';
import { show as clientShow } from '@/routes/clients';
import { show as visitShow } from '@/routes/clients/visits';
import type { Visit } from '@/types';

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
});

/**
 * Visites passées dont le compte rendu manque, remontées en tête de la liste :
 * c'est ce qui reste à faire, avant l'agenda des jours à venir.
 */
export function VisitReportsDue({ visits }: { visits: Visit[] }) {
    if (visits.length === 0) {
        return null;
    }

    return (
        <section
            aria-label="Comptes rendus à rédiger"
            className="grid grid-cols-1 gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3 dark:border-orange-900/60 dark:bg-orange-950/30"
        >
            <header className="flex flex-wrap items-baseline gap-2 px-1">
                <h2 className="flex items-center gap-2 text-base font-medium text-orange-800 dark:text-orange-200">
                    <NotebookPen className="size-4" aria-hidden />
                    Comptes rendus à rédiger
                </h2>
                <span className="text-sm text-orange-700/80 tabular-nums dark:text-orange-300/80">
                    {visits.length} visite{visits.length > 1 ? 's' : ''}
                </span>
            </header>
            <div className="bg-background overflow-hidden rounded-lg border">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-36">Visite</TableHead>
                            <TableHead className="w-[24%]">Client</TableHead>
                            <TableHead className="w-[38%]">Bien</TableHead>
                            <TableHead className="w-[18%]">Statut</TableHead>
                            <TableHead className="w-12" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visits.map((visit) => {
                            const date = new Date(visit.scheduled_at);

                            return (
                                <TableRow key={visit.id} className="align-top">
                                    <TableCell className="whitespace-nowrap">
                                        <Link
                                            href={visitShow({
                                                visit: visit.uuid,
                                            })}
                                            aria-label={`Fiche de la visite de ${visit.client.name}`}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            {dayFormat.format(date)}
                                        </Link>
                                        <span className="text-muted-foreground block text-xs tabular-nums">
                                            {timeFormat.format(date)}
                                        </span>
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
                                        <div className="flex flex-wrap items-center gap-1">
                                            <VisitStatusBadge
                                                status={visit.status}
                                                label={visit.status_label}
                                            />
                                            <VisitReportBadge visit={visit} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <VisitRowActions visit={visit} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </section>
    );
}
