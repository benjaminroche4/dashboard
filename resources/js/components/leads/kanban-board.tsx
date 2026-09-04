import { router } from '@inertiajs/react';
import { CalendarDays, MapPin } from 'lucide-react';
import { useEffect, useState, type DragEvent } from 'react';
import {
    LeadStatusMenu,
    leadStatusClasses,
} from '@/components/leads/lead-status-menu';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { status as leadStatusRoute } from '@/routes/leads';
import type { Lead, LeadStatus, LeadStatusOption } from '@/types';

type Props = {
    leads: Lead[];
    statuses: LeadStatusOption[];
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

/**
 * Kanban des leads : une colonne par statut, glisser-déposer pour changer
 * de colonne (mise à jour optimiste, retour arrière si le serveur refuse).
 * Le badge de chaque carte reste utilisable au clavier et sur mobile.
 */
export function LeadKanban({ leads, statuses }: Props) {
    const [items, setItems] = useState(leads);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [overColumn, setOverColumn] = useState<LeadStatus | null>(null);

    // Les props Inertia font foi dès qu'elles changent (rechargement temps réel).
    useEffect(() => setItems(leads), [leads]);

    const moveTo = (id: number, status: LeadStatusOption) => {
        const lead = items.find((candidate) => candidate.id === id);

        if (!lead || lead.status === status.value) {
            return;
        }

        setItems((current) =>
            current.map((candidate) =>
                candidate.id === id
                    ? {
                          ...candidate,
                          status: status.value,
                          status_label: status.label,
                      }
                    : candidate,
            ),
        );
        router.patch(
            leadStatusRoute({ lead: id }).url,
            { status: status.value },
            { preserveScroll: true, onError: () => setItems(leads) },
        );
    };

    const onDragStart = (event: DragEvent, id: number) => {
        event.dataTransfer.setData('text/plain', String(id));
        event.dataTransfer.effectAllowed = 'move';
        setDraggingId(id);
    };

    const onDrop = (event: DragEvent, status: LeadStatusOption) => {
        event.preventDefault();
        const id = Number(event.dataTransfer.getData('text/plain'));
        setOverColumn(null);
        setDraggingId(null);

        if (Number.isInteger(id) && id > 0) {
            moveTo(id, status);
        }
    };

    return (
        <div
            role="list"
            aria-label="Kanban des leads"
            className="-mx-4 flex min-h-0 flex-1 snap-x gap-4 overflow-x-auto px-4 pb-4"
        >
            {statuses.map((status) => {
                const column = items.filter(
                    (lead) => lead.status === status.value,
                );

                return (
                    <section
                        key={status.value}
                        role="listitem"
                        aria-label={status.label}
                        data-status={status.value}
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            setOverColumn(status.value);
                        }}
                        onDragLeave={(event) => {
                            if (
                                !event.currentTarget.contains(
                                    event.relatedTarget as Node | null,
                                )
                            ) {
                                setOverColumn(null);
                            }
                        }}
                        onDrop={(event) => onDrop(event, status)}
                        className={cn(
                            'flex min-w-72 flex-1 shrink-0 snap-start flex-col rounded-xl border transition-[box-shadow,transform]',
                            columnClasses[status.value],
                            overColumn === status.value &&
                                draggingId !== null &&
                                'ring-primary/30 ring-2',
                        )}
                    >
                        <header className="flex items-center justify-between px-3 pt-3 pb-2">
                            <h2
                                className={cn(
                                    'text-sm font-medium',
                                    columnTitleClasses[status.value],
                                )}
                            >
                                {status.label}
                            </h2>
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'bg-background/80 rounded-full px-2',
                                    leadStatusClasses[status.value],
                                )}
                                aria-label={`${column.length} lead(s)`}
                            >
                                {column.length}
                            </Badge>
                        </header>
                        <ol className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                            {column.map((lead) => (
                                <li key={lead.id}>
                                    <LeadCard
                                        lead={lead}
                                        statuses={statuses}
                                        dragging={draggingId === lead.id}
                                        onDragStart={(event) =>
                                            onDragStart(event, lead.id)
                                        }
                                        onDragEnd={() => {
                                            setDraggingId(null);
                                            setOverColumn(null);
                                        }}
                                    />
                                </li>
                            ))}
                            {column.length === 0 && (
                                <li className="text-muted-foreground flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs">
                                    Déposez un lead ici
                                </li>
                            )}
                        </ol>
                    </section>
                );
            })}
        </div>
    );
}

function LeadCard({
    lead,
    statuses,
    dragging,
    onDragStart,
    onDragEnd,
}: {
    lead: Lead;
    statuses: LeadStatusOption[];
    dragging: boolean;
    onDragStart: (event: DragEvent) => void;
    onDragEnd: () => void;
}) {
    return (
        <article
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            aria-label={lead.name}
            data-test="lead-card"
            className={cn(
                'bg-background grid min-w-0 cursor-grab gap-2 overflow-hidden rounded-lg border p-3 text-sm shadow-xs transition-opacity active:cursor-grabbing',
                dragging && 'opacity-40',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-medium">{lead.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                        {[lead.email, lead.phone].filter(Boolean).join(' · ')}
                    </p>
                </div>
                {lead.offer_label && (
                    <Badge
                        variant="outline"
                        className="max-w-[45%] shrink-0 truncate"
                    >
                        {lead.offer_label}
                    </Badge>
                )}
            </div>
            <dl className="text-muted-foreground grid gap-1 text-xs">
                {lead.arrival_at && (
                    <div className="flex min-w-0 items-center gap-1.5">
                        <CalendarDays
                            className="size-3.5 shrink-0"
                            aria-hidden
                        />
                        <dt className="sr-only">Arrivée</dt>
                        <dd className="truncate">
                            Arrive le {formatDate(lead.arrival_at)}
                        </dd>
                    </div>
                )}
                {lead.origin_city && (
                    <div className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <dt className="sr-only">Ville d'origine</dt>
                        <dd className="truncate">{lead.origin_city}</dd>
                    </div>
                )}
            </dl>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pt-1">
                <span className="min-w-0 truncate tabular-nums">
                    {lead.budget_cents === null
                        ? ''
                        : `${formatMoney(lead.budget_cents, lead.currency)} / mois`}
                </span>
                <div className="max-w-full shrink-0">
                    <LeadStatusMenu lead={lead} statuses={statuses} />
                </div>
            </div>
        </article>
    );
}
