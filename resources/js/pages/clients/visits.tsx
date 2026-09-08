import { Head, Link } from '@inertiajs/react';
import { CalendarClock, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { VisitDaySection } from '@/components/visits/visit-day-section';
import { VisitsDayMap } from '@/components/visits/visits-day-map';
import { defaultVisitDay, groupVisitsByDay } from '@/lib/visits';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';
import { create as visitCreate } from '@/routes/clients/visits';
import type {
    PropertyFormOptions,
    Visit,
    VisitClientOption,
    VisitPropertyOption,
    VisitStatus,
    VisitStatusOption,
} from '@/types';

type Props = PropertyFormOptions & {
    visits: Visit[];
    statuses: VisitStatusOption[];
    clients: VisitClientOption[];
    properties: VisitPropertyOption[];
};

export default function ClientsVisits({ visits, statuses }: Props) {
    const [statusFilter, setStatusFilter] = useState<VisitStatus | ''>('');
    const [clientFilter, setClientFilter] = useState('');
    const counts = visits.reduce<Partial<Record<VisitStatus, number>>>(
        (acc, visit) => ({
            ...acc,
            [visit.status]: (acc[visit.status] ?? 0) + 1,
        }),
        {},
    );
    const needle = clientFilter.trim().toLocaleLowerCase('fr');
    const visible = visits.filter(
        (visit) =>
            (!statusFilter || visit.status === statusFilter) &&
            (needle === '' ||
                visit.client.name.toLocaleLowerCase('fr').includes(needle)),
    );
    const planned = counts.planned ?? 0;
    // Carte : tous les jours ayant des visites, indépendamment des filtres de la liste.
    const allDays = useMemo(() => groupVisitsByDay(visits), [visits]);
    const mapDay = useMemo(() => defaultVisitDay(allDays), [allDays]);
    const days = groupVisitsByDay(visible);

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
                            <ToggleGroup
                                type="single"
                                value={statusFilter || 'all'}
                                onValueChange={(value) =>
                                    value &&
                                    setStatusFilter(
                                        value === 'all'
                                            ? ''
                                            : (value as VisitStatus),
                                    )
                                }
                                aria-label="Filtrer par statut"
                                className="flex-wrap justify-start gap-1"
                            >
                                <ToggleGroupItem
                                    value="all"
                                    className="h-8 rounded-md px-3 text-xs first:rounded-md last:rounded-md"
                                >
                                    Toutes
                                    <span className="text-muted-foreground tabular-nums">
                                        {visits.length}
                                    </span>
                                </ToggleGroupItem>
                                {statuses.map((status) => (
                                    <ToggleGroupItem
                                        key={status.value}
                                        value={status.value}
                                        className="h-8 rounded-md px-3 text-xs first:rounded-md last:rounded-md"
                                    >
                                        {status.label}
                                        <span className="text-muted-foreground tabular-nums">
                                            {counts[status.value] ?? 0}
                                        </span>
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
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
                        {days.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Aucune visite ne correspond aux filtres.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-8">
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
