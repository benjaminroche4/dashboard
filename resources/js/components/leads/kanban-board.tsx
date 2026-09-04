import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCorners,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { router } from '@inertiajs/react';
import { Archive, ChevronLeft, Clock, Star } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
    LeadStatusMenu,
    leadStatusClasses,
} from '@/components/leads/lead-status-menu';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatMoney } from '@/lib/format';
import { applyMove, columnOf, columnStats } from '@/lib/kanban';
import { cn } from '@/lib/utils';
import { show as leadShow, status as leadStatusRoute } from '@/routes/leads';
import type { Lead, LeadStatus, LeadStatusOption } from '@/types';

type Props = {
    leads: Lead[];
    statuses: LeadStatusOption[];
    /** Faux quand un tri autre que manuel est actif : on change de colonne, pas d'ordre. */
    reorderable?: boolean;
};

// Une teinte par colonne, en clair comme en sombre.
const columnClasses: Record<LeadStatus, string> = {
    todo: 'border-purple-200 bg-purple-50/70 dark:border-purple-900 dark:bg-purple-950/40',
    in_progress:
        'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/40',
    quote_sent:
        'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/40',
    converted:
        'border-green-200 bg-green-50/70 dark:border-green-900 dark:bg-green-950/40',
    archived:
        'border-neutral-200 bg-neutral-100/70 dark:border-neutral-800 dark:bg-neutral-900/40',
};

const columnTitleClasses: Record<LeadStatus, string> = {
    todo: 'text-purple-700 dark:text-purple-300',
    in_progress: 'text-sky-700 dark:text-sky-300',
    quote_sent: 'text-amber-700 dark:text-amber-300',
    converted: 'text-green-700 dark:text-green-300',
    archived: 'text-neutral-600 dark:text-neutral-400',
};

const statusSoft: Record<LeadStatus, string> = {
    todo: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200',
    in_progress: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
    quote_sent:
        'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
    converted:
        'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200',
    archived:
        'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

const ARCHIVE_KEY = 'leads.kanban.archived-open';

function readArchiveOpen(): boolean {
    try {
        return localStorage.getItem(ARCHIVE_KEY) === '1';
    } catch {
        return false;
    }
}

const cardId = (id: number) => `lead-${id}`;
const columnId = (status: LeadStatus) => `column-${status}`;

/**
 * Kanban des leads : une colonne par statut, glisser-déposer (souris, tactile,
 * clavier) pour changer de colonne et d'ordre, mise à jour optimiste et
 * retour arrière si le serveur refuse. La colonne Archivé est repliée par défaut.
 */
export function LeadKanban({ leads, statuses, reorderable = true }: Props) {
    const [items, setItems] = useState(leads);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [archivedOpen, setArchivedOpen] = useState(readArchiveOpen);

    // Les props Inertia font foi dès qu'elles changent (rechargement temps réel).
    useEffect(() => setItems(leads), [leads]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 180, tolerance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const toggleArchive = () => {
        setArchivedOpen((open) => {
            try {
                localStorage.setItem(ARCHIVE_KEY, open ? '0' : '1');
            } catch {
                // Stockage indisponible : l'état reste en mémoire.
            }

            return !open;
        });
    };

    const statusOf = (dndId: string | number): LeadStatusOption | undefined => {
        const key = String(dndId);

        if (key.startsWith('column-')) {
            return statuses.find(
                (status) => status.value === key.replace('column-', ''),
            );
        }

        const lead = items.find((candidate) => cardId(candidate.id) === key);

        return statuses.find((status) => status.value === lead?.status);
    };

    /** Index visé dans la colonne : celui de la carte survolée, sinon la fin. */
    const indexOf = (dndId: string | number, status: LeadStatus): number => {
        const column = columnOf(items, status);
        const key = String(dndId);
        const index = column.findIndex((lead) => cardId(lead.id) === key);

        return index === -1 ? column.length : index;
    };

    const onDragStart = ({ active }: DragStartEvent) => {
        setActiveId(Number(String(active.id).replace('lead-', '')));
    };

    const onDragOver = ({ active, over }: DragOverEvent) => {
        if (!over) {
            return;
        }

        const id = Number(String(active.id).replace('lead-', ''));
        const target = statusOf(over.id);
        const current = items.find((lead) => lead.id === id);

        if (!target || !current || current.status === target.value) {
            return;
        }

        // Changement de colonne en direct pour que la carte suive le curseur.
        setItems((state) =>
            applyMove(state, id, target, indexOf(over.id, target.value)),
        );
    };

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        setActiveId(null);

        if (!over) {
            setItems(leads);

            return;
        }

        const id = Number(String(active.id).replace('lead-', ''));
        const target = statusOf(over.id);
        const original = leads.find((lead) => lead.id === id);

        if (!target || !original) {
            return;
        }

        const index = reorderable
            ? indexOf(over.id, target.value)
            : original.status === target.value
              ? original.position
              : 0;
        const next = applyMove(items, id, target, index);
        const moved = next.find((lead) => lead.id === id);

        if (
            !moved ||
            (moved.status === original.status &&
                moved.position === original.position)
        ) {
            setItems(leads);

            return;
        }

        setItems(next);
        router.patch(
            leadStatusRoute({ lead: id }).url,
            { status: moved.status, position: moved.position },
            { preserveScroll: true, onError: () => setItems(leads) },
        );
    };

    const active =
        activeId === null ? null : items.find((lead) => lead.id === activeId);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => {
                setActiveId(null);
                setItems(leads);
            }}
        >
            <div
                role="list"
                aria-label="Kanban des leads"
                className="-mx-4 flex min-h-0 flex-1 snap-x gap-4 overflow-x-auto px-4 pb-4"
            >
                {statuses.map((status) => {
                    const column = columnOf(items, status.value);
                    const collapsed =
                        status.value === 'archived' && !archivedOpen;

                    return (
                        <KanbanColumn
                            key={status.value}
                            status={status}
                            leads={column}
                            collapsed={collapsed}
                            onToggle={
                                status.value === 'archived'
                                    ? toggleArchive
                                    : undefined
                            }
                        >
                            {column.map((lead) => (
                                <SortableCard
                                    key={lead.id}
                                    lead={lead}
                                    statuses={statuses}
                                    dragging={activeId === lead.id}
                                />
                            ))}
                        </KanbanColumn>
                    );
                })}
            </div>
            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
                {active ? (
                    <LeadCard lead={active} statuses={statuses} overlay />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function KanbanColumn({
    status,
    leads,
    collapsed,
    onToggle,
    children,
}: {
    status: LeadStatusOption;
    leads: Lead[];
    collapsed: boolean;
    onToggle?: () => void;
    children: ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: columnId(status.value),
        data: { status: status.value },
    });
    const stats = columnStats(leads);

    if (collapsed) {
        return (
            <section
                ref={setNodeRef}
                role="listitem"
                aria-label={status.label}
                data-status={status.value}
                data-collapsed
                className={cn(
                    'flex w-12 shrink-0 snap-start flex-col items-center gap-3 rounded-xl border py-3 transition-[box-shadow]',
                    columnClasses[status.value],
                    isOver && 'ring-primary/30 ring-2',
                )}
            >
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={`Déplier ${status.label} (${stats.count})`}
                    aria-expanded={false}
                    className={cn(
                        'flex flex-col items-center gap-2 rounded-md p-1 text-xs font-medium',
                        columnTitleClasses[status.value],
                    )}
                >
                    <Archive className="size-4" aria-hidden />
                    <span className="[writing-mode:vertical-rl]">
                        {status.label}
                    </span>
                    <Badge
                        variant="secondary"
                        className={cn(
                            'bg-background/80 rounded-full px-2',
                            leadStatusClasses[status.value],
                        )}
                    >
                        {stats.count}
                    </Badge>
                </button>
            </section>
        );
    }

    return (
        <section
            ref={setNodeRef}
            role="listitem"
            aria-label={status.label}
            data-status={status.value}
            className={cn(
                'flex min-w-72 flex-1 shrink-0 snap-start flex-col rounded-xl border transition-[box-shadow]',
                columnClasses[status.value],
                isOver && 'ring-primary/30 ring-2',
            )}
        >
            <header className="grid gap-1 px-3 pt-3 pb-2">
                <div className="flex items-center justify-between gap-2">
                    <h2
                        className={cn(
                            'truncate text-sm font-medium',
                            columnTitleClasses[status.value],
                        )}
                    >
                        {status.label}
                    </h2>
                    <div className="flex shrink-0 items-center gap-1">
                        <Badge
                            variant="secondary"
                            className={cn(
                                'bg-background/80 rounded-full px-2',
                                leadStatusClasses[status.value],
                            )}
                            aria-label={`${stats.count} lead(s)`}
                        >
                            {stats.count}
                        </Badge>
                        {onToggle && (
                            <button
                                type="button"
                                onClick={onToggle}
                                aria-label={`Replier ${status.label}`}
                                aria-expanded
                                className="text-muted-foreground hover:bg-background/60 rounded-md p-1"
                            >
                                <ChevronLeft className="size-4" aria-hidden />
                            </button>
                        )}
                    </div>
                </div>
                <p
                    className="text-muted-foreground truncate text-xs tabular-nums"
                    data-test="column-stats"
                >
                    {stats.budgets.length === 0
                        ? 'Aucun budget'
                        : stats.budgets
                              .map((budget) =>
                                  formatMoney(budget.cents, budget.currency),
                              )
                              .join(' + ')}
                    {stats.averageScore !== null && (
                        <>
                            {' · '}
                            <Star
                                className="inline size-3 fill-current align-[-1px] text-amber-500"
                                aria-hidden
                            />{' '}
                            {stats.averageScore.toLocaleString('fr-FR')}
                        </>
                    )}
                </p>
            </header>
            <SortableContext
                items={leads.map((lead) => cardId(lead.id))}
                strategy={verticalListSortingStrategy}
            >
                <ol
                    role="list"
                    className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2"
                >
                    {children}
                    {leads.length === 0 && (
                        <li className="text-muted-foreground flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs">
                            Déposez un lead ici
                        </li>
                    )}
                </ol>
            </SortableContext>
        </section>
    );
}

function SortableCard({
    lead,
    statuses,
    dragging,
}: {
    lead: Lead;
    statuses: LeadStatusOption[];
    dragging: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: cardId(lead.id), data: { status: lead.status } });

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(dragging && 'opacity-40')}
        >
            <LeadCard
                lead={lead}
                statuses={statuses}
                handleProps={{ ...attributes, ...listeners }}
            />
        </li>
    );
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

export function LeadCard({
    lead,
    statuses,
    handleProps = {},
    overlay = false,
}: {
    lead: Lead;
    statuses: LeadStatusOption[];
    handleProps?: Record<string, unknown>;
    overlay?: boolean;
}) {
    const contact = lead.email ?? lead.phone ?? '';
    const budget =
        lead.budget_cents === null
            ? null
            : formatMoney(lead.budget_cents, lead.currency);
    const rows: { label: string; value: string }[] = [
        { label: 'Offre', value: lead.offer_label ?? '—' },
        { label: 'Budget', value: budget ? `${budget} / mois` : '—' },
        {
            label: 'Arrivée',
            value: lead.arrival_at ? formatDate(lead.arrival_at) : '—',
        },
        { label: 'Ville', value: lead.origin_city ?? '—' },
        { label: 'Source', value: lead.source_label },
    ];

    return (
        <article
            {...handleProps}
            aria-label={lead.name}
            data-test="lead-card"
            onClick={() => {
                if (!overlay) {
                    router.visit(leadShow({ lead: lead.id }).url);
                }
            }}
            className={cn(
                'bg-background grid min-w-0 cursor-grab gap-3 overflow-hidden rounded-lg border p-3 text-sm shadow-xs outline-none select-none focus-visible:ring-2 active:cursor-grabbing',
                overlay && 'cursor-grabbing shadow-lg',
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                        statusSoft[lead.status],
                    )}
                >
                    {initials(lead.name)}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{lead.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                        {contact}
                    </p>
                </div>
                <div
                    className="max-w-full shrink-0"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <LeadStatusMenu lead={lead} statuses={statuses} />
                </div>
            </div>
            <dl className="bg-muted/50 grid min-w-0 grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-md border p-2.5 text-xs">
                {rows.map((row) => (
                    <div key={row.label} className="contents">
                        <dt className="text-muted-foreground truncate">
                            {row.label}
                        </dt>
                        <dd className="truncate text-right tabular-nums">
                            {row.value}
                        </dd>
                    </div>
                ))}
            </dl>
            {lead.message && (
                <p className="text-muted-foreground line-clamp-2 text-xs">
                    {lead.message}
                </p>
            )}
            <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                    <Clock className="size-3.5 shrink-0" aria-hidden />
                    <span className="sr-only">Ajouté le</span>
                    <span className="truncate">
                        {lead.created_at
                            ? formatDate(lead.created_at.slice(0, 10))
                            : '—'}
                    </span>
                </p>
                {lead.score !== null && (
                    <span
                        className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-amber-600 tabular-nums dark:text-amber-400"
                        aria-label={`Qualité ${lead.score} sur 5`}
                        title={`Qualité ${lead.score} sur 5`}
                    >
                        <Star className="size-3.5 fill-current" aria-hidden />
                        {lead.score}
                    </span>
                )}
            </div>
        </article>
    );
}
