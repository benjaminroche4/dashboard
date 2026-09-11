import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    clientColumnLabels,
    clientColumns,
} from '@/components/clients/columns';
import {
    isFollowedBy,
    MyClientsFilter,
} from '@/components/clients/my-clients-filter';
import { priorityTones } from '@/components/clients/client-priority';
import { DataTable } from '@/components/data-table';
import { FilterMenu } from '@/components/filter-menu';
import { cn } from '@/lib/utils';
import { index as clientsIndex } from '@/routes/clients';
import type { Client, ClientPriority, ClientPriorityOption } from '@/types';

type Props = {
    clients: Client[];
    priorities: ClientPriorityOption[];
    /** Formules proposées (`Offer::options()`). */
    offers?: { value: string; label: string }[];
};

/** Clé du choix « Sans formule », qui n'a pas de valeur d'enum. */
const NO_OFFER = 'none';

const ARRIVAL_OPTIONS = [
    { value: 'soon', label: 'Dans moins de 30 jours' },
    { value: 'later', label: 'Plus tard' },
    { value: 'arrived', label: 'Déjà arrivé' },
    { value: 'unknown', label: 'Non renseignée' },
];

/** Un dossier est suivi par un membre, ou par personne. */
function assigneeKey(client: Client): string {
    return client.assignee === null ? 'none' : String(client.assignee.id);
}

/** Où en est l'arrivée du client, pour le filtre. */
function arrivalKey(client: Client): string {
    if (client.arrival_at === null) {
        return 'unknown';
    }

    const days = Math.ceil(
        (new Date(client.arrival_at).getTime() - Date.now()) / 86_400_000,
    );

    if (days < 0) {
        return 'arrived';
    }

    return days <= 30 ? 'soon' : 'later';
}

export default function ClientsIndex({
    clients,
    priorities,
    offers = [],
}: Props) {
    const { auth } = usePage().props;
    const [mineOnly, setMineOnly] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState<ClientPriority[]>([]);
    const [offerFilter, setOfferFilter] = useState<string[]>([]);
    const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
    const [arrivalFilter, setArrivalFilter] = useState<string[]>([]);
    const mine = useMemo(
        () => clients.filter((client) => isFollowedBy(client, auth.user.id)),
        [clients, auth.user.id],
    );
    /** Compte les dossiers par clé, pour les compteurs du menu. */
    const countBy = (key: (client: Client) => string) =>
        clients.reduce<Record<string, number>>(
            (acc, client) => ({
                ...acc,
                [key(client)]: (acc[key(client)] ?? 0) + 1,
            }),
            {},
        );

    const priorityCounts = useMemo(
        () => countBy((client) => client.priority),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [clients],
    );
    const offerCounts = useMemo(
        () => countBy((client) => client.offer ?? NO_OFFER),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [clients],
    );
    const assigneeCounts = useMemo(
        () => countBy((client) => assigneeKey(client)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [clients],
    );
    const arrivalCounts = useMemo(
        () => countBy((client) => arrivalKey(client)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [clients],
    );

    /** Membres qui suivent au moins un dossier, plus « Non attribué ». */
    const assignees = useMemo(() => {
        const seen = new Map<string, string>();

        for (const client of clients) {
            seen.set(
                assigneeKey(client),
                client.assignee?.name ?? 'Non attribué',
            );
        }

        return [...seen].map(([value, label]) => ({ value, label }));
    }, [clients]);

    const matches = (client: Client) =>
        (priorityFilter.length === 0 ||
            priorityFilter.includes(client.priority)) &&
        (offerFilter.length === 0 ||
            offerFilter.includes(client.offer ?? NO_OFFER)) &&
        (assigneeFilter.length === 0 ||
            assigneeFilter.includes(assigneeKey(client))) &&
        (arrivalFilter.length === 0 ||
            arrivalFilter.includes(arrivalKey(client)));

    const visible = (mineOnly ? mine : clients).filter(matches);

    return (
        <>
            <Head title="Dossiers" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="pt-8 pb-6">
                    <h1 className="text-lg font-medium">Dossiers</h1>
                    <p className="text-muted-foreground text-sm">
                        {visible.length} client
                        {visible.length > 1 ? 's' : ''} : les leads convertis,
                        suivis jusqu’à l’installation.
                    </p>
                </div>
                <DataTable
                    columns={clientColumns}
                    data={visible}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par client…"
                    columnLabels={clientColumnLabels}
                    frame="panel"
                    actions={
                        <>
                            <FilterMenu
                                groups={[
                                    {
                                        title: 'Priorité',
                                        options: priorities.map((priority) => ({
                                            value: priority.value,
                                            label: priority.label,
                                            icon: (
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        'size-2 rounded-full',
                                                        priorityTones[
                                                            priority.value
                                                        ],
                                                    )}
                                                />
                                            ),
                                        })),
                                        counts: priorityCounts,
                                        value: priorityFilter,
                                        onChange: (value) =>
                                            setPriorityFilter(
                                                value as ClientPriority[],
                                            ),
                                    },
                                    {
                                        title: 'Formule',
                                        options: [
                                            ...offers,
                                            {
                                                value: NO_OFFER,
                                                label: 'Sans formule',
                                            },
                                        ],
                                        counts: offerCounts,
                                        value: offerFilter,
                                        onChange: setOfferFilter,
                                    },
                                    {
                                        title: 'Suivi par',
                                        options: assignees,
                                        counts: assigneeCounts,
                                        value: assigneeFilter,
                                        onChange: setAssigneeFilter,
                                    },
                                    {
                                        title: 'Arrivée',
                                        options: ARRIVAL_OPTIONS,
                                        counts: arrivalCounts,
                                        value: arrivalFilter,
                                        onChange: setArrivalFilter,
                                    },
                                ]}
                            />
                            <MyClientsFilter
                                active={mineOnly}
                                onChange={setMineOnly}
                                count={mine.length}
                            />
                        </>
                    }
                    // La chemise de la colonne Client s'ouvre au survol de toute la ligne.
                    rowProps={() => ({ className: 'group' })}
                />
            </div>
        </>
    );
}

ClientsIndex.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Dossiers', href: clientsIndex() },
    ],
};
