import { Head, router, usePage } from '@inertiajs/react';
import { Archive, FolderPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ClientDialog } from '@/components/clients/client-dialog';
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
import { Button } from '@/components/ui/button';
import { FilterMenu } from '@/components/filter-menu';
import { useStoredState } from '@/hooks/use-stored-state';
import { cn } from '@/lib/utils';
import { index as clientsIndex } from '@/routes/clients';
import type {
    Client,
    ClientPriority,
    ClientPriorityOption,
    DocumentLanguage,
    LabeledOption,
} from '@/types';

type Props = {
    clients: Client[];
    /** Dossiers clôturés : chargés à la demande, comptés toujours. */
    archived?: { loaded: boolean; count: number };
    priorities: ClientPriorityOption[];
    /** Formules proposées (`Offer::options()`). */
    offers?: { value: string; label: string }[];
    /** Listes du dialogue « Nouveau dossier ». */
    languages?: LabeledOption<DocumentLanguage>[];
    currencies?: string[];
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
    archived = { loaded: false, count: 0 },
    priorities,
    offers = [],
    languages = [],
    currencies = ['EUR'],
}: Props) {
    const { auth } = usePage().props;
    const [creating, setCreating] = useState(false);
    // Les filtres sont une façon de travailler, pas une recherche du moment :
    // ils sont mémorisés et retrouvés tels quels après un rechargement.
    const [mineOnly, setMineOnly] = useStoredState(
        'clients.filters.mine',
        false,
    );
    const [priorityFilter, setPriorityFilter] = useStoredState<
        ClientPriority[]
    >('clients.filters.priority', []);
    const [offerFilter, setOfferFilter] = useStoredState<string[]>(
        'clients.filters.offer',
        [],
    );
    const [assigneeFilter, setAssigneeFilter] = useStoredState<string[]>(
        'clients.filters.assignee',
        [],
    );
    const [arrivalFilter, setArrivalFilter] = useStoredState<string[]>(
        'clients.filters.arrival',
        [],
    );
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
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Dossiers</h1>
                        <p className="text-muted-foreground text-sm">
                            {visible.length} client
                            {visible.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    {/* Un client recommandé n'a jamais été un lead : son
                        dossier s'ouvre directement. */}
                    <Button onClick={() => setCreating(true)}>
                        <FolderPlus />
                        Nouveau dossier
                    </Button>
                </div>
                <DataTable
                    columns={clientColumns}
                    data={visible}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par client…"
                    columnLabels={clientColumnLabels}
                    frame="panel"
                    storageKey="clients"
                    filters={
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
                            {/* Les dossiers clôturés ne se chargent qu'à la
                                demande : la liste reste celle du travail en cours. */}
                            {archived.count > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    aria-pressed={archived.loaded}
                                    className={cn(
                                        archived.loaded &&
                                            'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                                    )}
                                    onClick={() =>
                                        router.reload({
                                            data: {
                                                archived: archived.loaded
                                                    ? undefined
                                                    : 1,
                                            },
                                            only: ['clients', 'archived'],
                                        })
                                    }
                                >
                                    <Archive aria-hidden />
                                    Archivés ({archived.count})
                                </Button>
                            )}
                        </>
                    }
                    // La chemise de la colonne Client s'ouvre au survol de toute
                    // la ligne ; un dossier clôturé se lit en retrait.
                    rowProps={(client) => ({
                        className: cn(
                            'group',
                            client.closed_at !== null && 'opacity-60',
                        ),
                    })}
                />
            </div>

            <ClientDialog
                open={creating}
                onOpenChange={setCreating}
                languages={languages}
                offers={offers}
                currencies={currencies}
            />
        </>
    );
}

ClientsIndex.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Dossiers', href: clientsIndex() },
    ],
};
