import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link, router } from '@inertiajs/react';
import { Building2, Clock, GripVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { initials } from '@/components/leads/lead-assign-menu';
import {
    LeadArchiveDialog,
    type ArchiveChoice,
} from '@/components/leads/lead-archive-dialog';
import {
    LeadStatusMenu,
    leadStatusDot,
} from '@/components/leads/lead-status-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    moveOwnerLead,
    ownerColumn,
    ownerKanbanOrder,
} from '@/lib/owner-kanban';
import { cn } from '@/lib/utils';
import { show as leadShow, status as leadStatusRoute } from '@/routes/leads';
import type {
    LabeledOption,
    LeadLossReason,
    LeadStatus,
    LeadStatusOption,
    OwnerLead,
} from '@/types';

const shortDate = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
});

const columnTones: Record<LeadStatus, string> = {
    todo: 'border-purple-200 bg-purple-50/70 dark:border-purple-900 dark:bg-purple-950/40',
    in_progress:
        'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/40',
    quote_sent:
        'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/40',
    converted:
        'border-green-200 bg-green-50/70 dark:border-green-900 dark:bg-green-950/40',
    archived:
        'border-neutral-200 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-950/40',
};

const overTones: Record<LeadStatus, string> = {
    todo: 'border-purple-300 bg-purple-100 dark:border-purple-700 dark:bg-purple-950/70',
    in_progress:
        'border-sky-300 bg-sky-100 dark:border-sky-700 dark:bg-sky-950/70',
    quote_sent:
        'border-amber-300 bg-amber-100 dark:border-amber-700 dark:bg-amber-950/70',
    converted:
        'border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-950/70',
    archived:
        'border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/70',
};

type Props = {
    leads: OwnerLead[];
    /** Colonnes, dans l'ordre métier (libellés propriétaires : « En signature »). */
    statuses: LeadStatusOption[];
    lossReasons: LabeledOption<LeadLossReason>[];
};

/**
 * Kanban des leads propriétaires : une colonne par statut, glisser-déposer
 * entre colonnes (souris, tactile, clavier) avec mise à jour optimiste, badge
 * de statut cliquable sur chaque carte. Passer en « Archivé » demande un motif.
 */
export function OwnerLeadKanban({ leads, statuses, lossReasons }: Props) {
    const [items, setItems] = useState(leads);
    const [archiving, setArchiving] = useState<OwnerLead | null>(null);
    const [busy, setBusy] = useState(false);

    // Les props changent après un rechargement Inertia (temps réel, retour serveur).
    useEffect(() => setItems(leads), [leads]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 8 },
        }),
        useSensor(KeyboardSensor),
    );
    const columns = ownerKanbanOrder
        .map((value) => statuses.find((status) => status.value === value))
        .filter((status): status is LeadStatusOption => status !== undefined);

    const patch = (
        lead: OwnerLead,
        status: LeadStatusOption,
        extra: Record<string, string> = {},
    ) => {
        const previous = items;
        setItems((current) => moveOwnerLead(current, lead.id, status));
        setBusy(true);
        router.patch(
            leadStatusRoute({ lead: lead.uuid }).url,
            { status: status.value, ...extra },
            {
                preserveScroll: true,
                only: ['leads'],
                onError: () => setItems(previous),
                onFinish: () => setBusy(false),
            },
        );
    };

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over) {
            return;
        }

        const lead = items.find((item) => item.id === Number(active.id));
        const status = columns.find((column) => column.value === over.id);

        if (!lead || !status || lead.status === status.value) {
            return;
        }

        if (status.value === 'archived') {
            setArchiving(lead);

            return;
        }

        patch(lead, status);
    };

    const confirmArchive = (choice: ArchiveChoice) => {
        if (!archiving) {
            return;
        }

        const status = columns.find((column) => column.value === 'archived');

        if (status) {
            patch(archiving, status, {
                loss_reason: choice.reason,
                loss_note: choice.note,
            });
        }

        setArchiving(null);
    };

    return (
        <>
            <LeadArchiveDialog
                leadName={archiving?.name ?? ''}
                reasons={lossReasons}
                open={archiving !== null}
                onOpenChange={(open) => !open && setArchiving(null)}
                onConfirm={confirmArchive}
                busy={busy}
            />
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <div
                    className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
                    data-testid="owner-kanban"
                >
                    {columns.map((status) => (
                        <Column
                            key={status.value}
                            status={status}
                            leads={ownerColumn(items, status.value)}
                            statuses={statuses}
                            lossReasons={lossReasons}
                        />
                    ))}
                </div>
            </DndContext>
        </>
    );
}

function Column({
    status,
    leads,
    statuses,
    lossReasons,
}: {
    status: LeadStatusOption;
    leads: OwnerLead[];
    statuses: LeadStatusOption[];
    lossReasons: LabeledOption<LeadLossReason>[];
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status.value });

    return (
        <section
            ref={setNodeRef}
            aria-label={status.label}
            data-status={status.value}
            className={cn(
                'flex min-h-40 flex-col gap-2 rounded-xl border p-2 transition-colors',
                isOver ? overTones[status.value] : columnTones[status.value],
            )}
        >
            <header className="flex items-center justify-between gap-2 px-1 pt-1">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                    <span
                        aria-hidden
                        className={cn(
                            'size-2 rounded-full',
                            leadStatusDot[status.value],
                        )}
                    />
                    {status.label}
                </h2>
                <Badge
                    variant="secondary"
                    className="tabular-nums"
                    aria-label={`${leads.length} lead(s)`}
                >
                    {leads.length}
                </Badge>
            </header>
            {leads.length === 0 ? (
                <p className="text-muted-foreground px-1 py-4 text-center text-xs">
                    Aucun lead
                </p>
            ) : (
                <ul role="list" className="grid gap-2">
                    {leads.map((lead) => (
                        <Card
                            key={lead.id}
                            lead={lead}
                            statuses={statuses}
                            lossReasons={lossReasons}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

function Card({
    lead,
    statuses,
    lossReasons,
}: {
    lead: OwnerLead;
    statuses: LeadStatusOption[];
    lossReasons: LabeledOption<LeadLossReason>[];
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({ id: lead.id });

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform) }}
            data-testid={`owner-lead-${lead.id}`}
            className={cn(
                'bg-background grid gap-1.5 rounded-lg border p-3 text-sm shadow-xs',
                isDragging && 'z-10 opacity-80 shadow-md',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="grid min-w-0">
                    <Link
                        href={leadShow({ lead: lead.uuid })}
                        className="truncate font-medium underline-offset-4 hover:underline"
                    >
                        {lead.name}
                    </Link>
                    {lead.company && (
                        <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                            <Building2 className="size-3" aria-hidden />
                            {lead.company}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground -mr-1 cursor-grab touch-none rounded p-1 active:cursor-grabbing"
                    aria-label={`Déplacer ${lead.name}`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="size-4" aria-hidden />
                </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
                <LeadStatusMenu
                    lead={lead}
                    statuses={statuses}
                    lossReasons={lossReasons}
                />
                <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                    {lead.reference}
                </span>
            </div>
            <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1 truncate">
                    <Clock className="size-3 shrink-0" aria-hidden />
                    {lead.last_contacted_at
                        ? `Contact ${shortDate.format(new Date(lead.last_contacted_at))}`
                        : 'Jamais contacté'}
                </span>
                {lead.assignee ? (
                    <span
                        className="flex items-center gap-1"
                        title={`Suivi par ${lead.assignee}`}
                    >
                        <Avatar className="size-5">
                            <AvatarImage
                                src={lead.assignee_avatar ?? undefined}
                                alt=""
                            />
                            <AvatarFallback className="text-[9px]">
                                {initials(lead.assignee)}
                            </AvatarFallback>
                        </Avatar>
                    </span>
                ) : (
                    <span className="text-amber-700 dark:text-amber-400">
                        Non attribué
                    </span>
                )}
            </div>
        </li>
    );
}
