import { Link } from '@inertiajs/react';
import { MapPin, Navigation } from 'lucide-react';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { WriteReportButton } from '@/components/visits/write-report-button';
import { useEnteringKeys } from '@/hooks/use-entering-keys';
import { timeFormat, visitAddress } from '@/lib/visits';
import { cn } from '@/lib/utils';
import { show as clientShow } from '@/routes/clients';
import { show as visitShow } from '@/routes/clients/visits';
import type { Visit } from '@/types';

/** Itinéraire vers l'adresse, dans l'application de cartes du téléphone. */
export function directionsUrl(address: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/**
 * Ma tournée du jour, pensée pour le téléphone : l'heure, le client, l'adresse
 * en un tap vers l'itinéraire, et « Rédiger » dès que la visite est passée.
 * Une liste, pas un tableau : entre deux adresses on n'a qu'un pouce.
 */
export function TodayVisits({ visits }: { visits: Visit[] }) {
    const entering = useEnteringKeys(visits.map((visit) => visit.uuid));

    if (visits.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                Aucune visite aujourd’hui.
            </p>
        );
    }

    return (
        <ol role="list" className="divide-border grid divide-y">
            {visits.map((visit) => {
                const address = visitAddress(visit);

                return (
                    <li
                        key={visit.uuid}
                        className={cn(
                            'grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-start',
                            entering.has(visit.uuid) &&
                                'animate-row-enter motion-reduce:animate-none',
                        )}
                    >
                        <Link
                            href={visitShow({ visit: visit.uuid })}
                            className="text-base font-medium tabular-nums underline-offset-4 hover:underline"
                        >
                            {timeFormat.format(new Date(visit.scheduled_at))}
                        </Link>
                        <div className="grid min-w-0 gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={clientShow({
                                        lead: visit.client.uuid,
                                    })}
                                    className="truncate font-medium underline-offset-4 hover:underline"
                                >
                                    {visit.client.name}
                                </Link>
                                <VisitStatusBadge
                                    status={visit.status}
                                    label={visit.status_label}
                                />
                            </div>
                            <p className="text-muted-foreground truncate text-sm">
                                {visit.property.label}
                            </p>
                            {address ? (
                                <a
                                    href={directionsUrl(address)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
                                >
                                    <Navigation
                                        className="size-3.5"
                                        aria-hidden
                                    />
                                    {address}
                                </a>
                            ) : (
                                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                                    <MapPin className="size-3.5" aria-hidden />
                                    Adresse non renseignée
                                </span>
                            )}
                        </div>
                        <WriteReportButton visit={visit} />
                    </li>
                );
            })}
        </ol>
    );
}
