import { Head, Link } from '@inertiajs/react';
import { CalendarClock, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FilterMenu } from '@/components/filter-menu';
import { Input } from '@/components/ui/input';
import { VisitDaySection } from '@/components/visits/visit-day-section';
import { VisitReportsDue } from '@/components/visits/visit-reports-due';
import { VisitsDayMap } from '@/components/visits/visits-day-map';
import {
    defaultVisitDay,
    groupVisitsByDay,
    openVisits,
    visitPendingKinds,
    visitPendingOptions,
    type VisitPendingKind,
} from '@/lib/visits';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';
import { create as visitCreate } from '@/routes/clients/visits';
import type { Visit, VisitStatus, VisitStatusOption } from '@/types';

type Props = {
    visits: Visit[];
    statuses: VisitStatusOption[];
};

export default function ClientsVisits({ visits, statuses }: Props) {
    const [statusFilter, setStatusFilter] = useState<VisitStatus[]>([]);
    // « En attente » : les visites qui attendent encore un retour — le compte
    // rendu de l'équipe, la décision du client.
    const [pendingFilter, setPendingFilter] = useState<VisitPendingKind[]>([]);
    const [clientFilter, setClientFilter] = useState('');
    const [showPast, setShowPast] = useState(false);
    const counts = visits.reduce<Partial<Record<VisitStatus, number>>>(
        (acc, visit) => ({
            ...acc,
            [visit.status]: (acc[visit.status] ?? 0) + 1,
        }),
        {},
    );
    const pendingCounts = visits.reduce<
        Partial<Record<VisitPendingKind, number>>
    >((acc, visit) => {
        for (const kind of visitPendingKinds(visit)) {
            acc[kind] = (acc[kind] ?? 0) + 1;
        }

        return acc;
    }, {});
    const needle = clientFilter.trim().toLocaleLowerCase('fr');
    // Par défaut, la liste ne montre que ce qui reste à faire : les visites à
    // venir et les visites passées sans compte rendu. Un filtre de statut ou le
    // bouton « Voir les visites passées » rouvre les autres.
    const open = useMemo(() => openVisits(visits), [visits]);
    const closedCount = visits.length - open.length;
    // Filtrer par statut rouvre les visites passées : sans cela, cocher
    // « Annulée » ne montrerait rien.
    const showsPast =
        showPast || statusFilter.length > 0 || pendingFilter.length > 0;
    const visible = (showsPast ? visits : open).filter(
        (visit) =>
            (statusFilter.length === 0 ||
                statusFilter.includes(visit.status)) &&
            (pendingFilter.length === 0 ||
                visitPendingKinds(visit).some((kind) =>
                    pendingFilter.includes(kind),
                )) &&
            (needle === '' ||
                visit.client.name.toLocaleLowerCase('fr').includes(needle)),
    );
    const planned = counts.planned ?? 0;
    // Carte : tous les jours ayant des visites, indépendamment des filtres de la liste.
    const allDays = useMemo(() => groupVisitsByDay(visits), [visits]);
    const mapDay = useMemo(() => defaultVisitDay(allDays), [allDays]);
    // Ce qui reste à faire passe devant l'agenda : les visites passées dont le
    // compte rendu manque sortent des journées pour ouvrir la liste.
    const reportsDue = visible.filter((visit) => visit.report_due);
    const days = groupVisitsByDay(visible.filter((visit) => !visit.report_due));

    return (
        <>
            <Head title="Visites" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Visites</h1>
                        <p className="text-muted-foreground text-sm">
                            {visits.length} visite(s)
                            {planned > 0 && ` · ${planned} planifiée(s)`}
                            {closedCount > 0 &&
                                ` · ${closedCount} passée(s) masquée(s)`}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={visitCreate()}>
                            <Plus />
                            Planifier une visite
                        </Link>
                    </Button>
                </div>
                {visits.length === 0 ? (
                    <section
                        aria-label="Aucune visite"
                        className="bg-sidebar text-muted-foreground grid grid-cols-1 place-items-center gap-2 rounded-xl border px-4 py-16 text-center text-sm"
                    >
                        <CalendarClock className="size-6" aria-hidden />
                        <p className="text-foreground font-medium">
                            Aucune visite planifiée pour le moment
                        </p>
                        <p className="max-w-md text-pretty">
                            Planifiez une visite pour un client : le bien visité
                            rejoint l’annuaire des biens.
                        </p>
                    </section>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {mapDay && (
                            <VisitsDayMap
                                key={mapDay.key}
                                days={allDays}
                                initialDay={mapDay}
                            />
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                            <FilterMenu
                                groups={[
                                    {
                                        title: 'Statut',
                                        options: statuses.map((status) => ({
                                            value: status.value,
                                            label: status.label,
                                        })),
                                        counts,
                                        value: statusFilter,
                                        onChange: (value) =>
                                            setStatusFilter(
                                                value as VisitStatus[],
                                            ),
                                    },
                                    {
                                        title: 'En attente',
                                        options: visitPendingOptions,
                                        counts: pendingCounts,
                                        value: pendingFilter,
                                        onChange: (value) =>
                                            setPendingFilter(
                                                value as VisitPendingKind[],
                                            ),
                                    },
                                    ...(closedCount > 0
                                        ? [
                                              {
                                                  title: 'Affichage',
                                                  options: [
                                                      {
                                                          value: 'past',
                                                          label: 'Visites passées',
                                                      },
                                                  ],
                                                  counts: {
                                                      past: closedCount,
                                                  },
                                                  value: showPast
                                                      ? ['past']
                                                      : [],
                                                  onChange: (value: string[]) =>
                                                      setShowPast(
                                                          value.includes(
                                                              'past',
                                                          ),
                                                      ),
                                              },
                                          ]
                                        : []),
                                ]}
                            />
                            <Input
                                value={clientFilter}
                                onChange={(event) =>
                                    setClientFilter(event.target.value)
                                }
                                placeholder="Filtrer par client…"
                                aria-label="Filtrer par client"
                                className="ml-auto max-w-xs"
                            />
                        </div>
                        {days.length === 0 && reportsDue.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Aucune visite ne correspond aux filtres.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-8">
                                <VisitReportsDue visits={reportsDue} />
                                {days.map((day) => (
                                    <VisitDaySection key={day.key} day={day} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

ClientsVisits.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Visites', href: clientsVisits() },
    ],
};
