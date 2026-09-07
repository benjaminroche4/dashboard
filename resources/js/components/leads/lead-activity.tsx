import { router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { leadStatusDot } from '@/components/leads/lead-status-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bubble, BubbleContent, BubbleGroup } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Message,
    MessageAvatar,
    MessageContent,
    MessageFooter,
} from '@/components/ui/message';
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    destroy as destroyNote,
    update as updateNote,
} from '@/routes/leads/notes';
import type { LeadNote, LeadStatusChange } from '@/types';

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
});

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

/** Préfixe posé par `SendLeadDossier` sur les notes d'envoi. */
const SEND_PREFIX = 'Envoi au lead';

export type ActivityFilter = 'all' | 'notes' | 'sends' | 'statuses';

export const activityFilters: { value: ActivityFilter; label: string }[] = [
    { value: 'all', label: 'Tout' },
    { value: 'notes', label: 'Notes' },
    { value: 'sends', label: 'Envois' },
    { value: 'statuses', label: 'Statuts' },
];

export type ActivityItem =
    | { kind: 'note'; at: string; note: LeadNote; isSend: boolean }
    | { kind: 'status'; at: string; change: LeadStatusChange };

/** Fusionne notes et changements de statut en une chronologie ascendante. */
export function buildActivity(
    notes: LeadNote[],
    history: LeadStatusChange[],
    filter: ActivityFilter = 'all',
): ActivityItem[] {
    const items: ActivityItem[] = [
        ...notes.map((note): ActivityItem => ({
            kind: 'note',
            at: note.at ?? '',
            note,
            isSend: note.body.startsWith(SEND_PREFIX),
        })),
        ...history.map((change): ActivityItem => ({
            kind: 'status',
            at: change.at,
            change,
        })),
    ];

    return items
        .filter((item) => {
            switch (filter) {
                case 'notes':
                    return item.kind === 'note' && !item.isSend;
                case 'sends':
                    return item.kind === 'note' && item.isSend;
                case 'statuses':
                    return item.kind === 'status';
                default:
                    return true;
            }
        })
        .sort((a, b) => a.at.localeCompare(b.at));
}

/** Découpe le texte pour mettre en valeur les « @Prénom Nom » connus. */
export function highlightMentions(
    body: string,
    names: string[],
): (string | { mention: string })[] {
    if (names.length === 0 || !body.includes('@')) {
        return [body];
    }

    const pattern = new RegExp(
        `@(${[...names]
            .sort((a, b) => b.length - a.length)
            .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|')})`,
        'g',
    );
    const parts: (string | { mention: string })[] = [];
    let last = 0;

    for (const match of body.matchAll(pattern)) {
        const index = match.index ?? 0;

        if (index > last) {
            parts.push(body.slice(last, index));
        }

        parts.push({ mention: match[0] });
        last = index + match[0].length;
    }

    if (last < body.length) {
        parts.push(body.slice(last));
    }

    return parts;
}

type Group =
    | { kind: 'notes'; key: string; author: string; notes: LeadNote[] }
    | { kind: 'status'; key: string; change: LeadStatusChange };

/** Regroupe les notes consécutives d'un même auteur, les statuts restent seuls. */
function groupActivity(items: ActivityItem[]): Group[] {
    const groups: Group[] = [];

    for (const item of items) {
        if (item.kind === 'status') {
            groups.push({
                kind: 'status',
                key: `s${item.change.id}`,
                change: item.change,
            });
            continue;
        }

        const author = item.note.by ?? 'Équipe';
        const last = groups.at(-1);

        if (
            last?.kind === 'notes' &&
            last.author === author &&
            last.notes[0]?.mine === item.note.mine
        ) {
            last.notes.push(item.note);
        } else {
            groups.push({
                kind: 'notes',
                key: `n${item.note.id}`,
                author,
                notes: [item.note],
            });
        }
    }

    return groups;
}

function NoteBubble({
    note,
    mine,
    leadUuid,
    staffNames,
}: {
    note: LeadNote;
    mine: boolean;
    leadUuid: string;
    staffNames: string[];
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(note.body);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const isSend = note.body.startsWith(SEND_PREFIX);

    const save = () => {
        if (draft.trim() === '' || draft === note.body) {
            setEditing(false);
            setDraft(note.body);

            return;
        }

        setBusy(true);
        router.patch(
            updateNote({ lead: leadUuid, note: note.uuid }).url,
            { body: draft },
            {
                preserveScroll: true,
                onSuccess: () => setEditing(false),
                onFinish: () => setBusy(false),
            },
        );
    };
    const remove = () => {
        setBusy(true);
        router.delete(destroyNote({ lead: leadUuid, note: note.uuid }).url, {
            preserveScroll: true,
            onFinish: () => {
                setBusy(false);
                setConfirming(false);
            },
        });
    };

    return (
        <Bubble
            className="group/note max-w-[90%]"
            align={mine ? 'end' : 'start'}
            variant={isSend ? 'outline' : mine ? 'default' : 'muted'}
        >
            {editing ? (
                <BubbleContent className="grid w-full gap-2 py-1.5">
                    <Textarea
                        aria-label="Modifier la note"
                        rows={2}
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (
                                event.key === 'Enter' &&
                                (event.metaKey || event.ctrlKey)
                            ) {
                                event.preventDefault();
                                save();
                            }

                            if (event.key === 'Escape') {
                                setEditing(false);
                                setDraft(note.body);
                            }
                        }}
                        className="bg-background text-foreground"
                    />
                    <div className="flex justify-end gap-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-inherit"
                            onClick={() => {
                                setEditing(false);
                                setDraft(note.body);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={save}
                        >
                            Enregistrer
                        </Button>
                    </div>
                </BubbleContent>
            ) : (
                <BubbleContent className="py-1.5 leading-normal whitespace-pre-line">
                    {highlightMentions(note.body, staffNames).map(
                        (part, index) =>
                            typeof part === 'string' ? (
                                part
                            ) : (
                                <span
                                    key={index}
                                    data-mention
                                    className="rounded bg-current/15 px-1 font-medium"
                                >
                                    {part.mention}
                                </span>
                            ),
                    )}
                </BubbleContent>
            )}
            {(note.can_edit || note.can_delete) &&
                !editing && (
                    // Actions sur ma note, visibles au survol : à côté de la bulle,
                    // centrées verticalement, sans prendre de place dans le fil.
                    <div
                        className={cn(
                            'absolute top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-focus-within/note:opacity-100 group-hover/note:opacity-100 motion-reduce:transition-none',
                            mine ? 'right-full mr-1' : 'left-full ml-1',
                        )}
                    >
                        {note.can_edit && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground size-6"
                                aria-label="Modifier la note"
                                onClick={() => setEditing(true)}
                            >
                                <Pencil className="size-3.5" aria-hidden />
                            </Button>
                        )}
                        {note.can_delete && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive size-6"
                                aria-label="Supprimer la note"
                                onClick={() => setConfirming(true)}
                            >
                                <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                        )}
                    </div>
                )}
            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent>
                    <DialogTitle>Supprimer cette note ?</DialogTitle>
                    <DialogDescription>
                        La note sera retirée du fil pour toute l'équipe.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={busy}
                            onClick={remove}
                        >
                            Supprimer la note
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Bubble>
    );
}

/**
 * Fil d'activité du lead : notes (bulles de messagerie, les miennes à droite),
 * envois au lead (bulles encadrées) et changements de statut (repères sur la
 * ligne), dans l'ordre chronologique, avec un filtre par type.
 */
export function LeadActivity({
    leadUuid,
    notes,
    history,
    staffNames = [],
    filter,
    className,
}: {
    leadUuid: string;
    notes: LeadNote[];
    history: LeadStatusChange[];
    /** Noms du staff, pour mettre en valeur les mentions. */
    staffNames?: string[];
    filter: ActivityFilter;
    className?: string;
}) {
    const groups = useMemo(
        () => groupActivity(buildActivity(notes, history, filter)),
        [notes, history, filter],
    );

    if (groups.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                {filter === 'all'
                    ? 'Aucune activité pour le moment.'
                    : 'Rien dans cette catégorie.'}
            </p>
        );
    }

    return (
        <MessageScrollerProvider>
            <MessageScroller
                className={cn('max-h-56', className)}
                aria-label="Fil d’activité"
            >
                <MessageScrollerViewport>
                    <MessageScrollerContent
                        role="list"
                        // justify-end : le fil est collé en bas, comme une discussion.
                        // pb-8 : le fondu du bas du viewport ne masque pas la dernière bulle.
                        className="min-h-full justify-end gap-1 pt-0.5 pb-8"
                    >
                        {groups.map((group) => {
                            if (group.kind === 'status') {
                                const { change } = group;

                                return (
                                    <MessageScrollerItem
                                        key={group.key}
                                        messageId={group.key}
                                        role="listitem"
                                        data-kind="status"
                                        className="flex items-center gap-2 py-1 text-xs"
                                    >
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'size-2 shrink-0 rounded-full',
                                                leadStatusDot[change.to_status],
                                            )}
                                        />
                                        <span className="text-muted-foreground min-w-0 truncate">
                                            <span className="text-foreground font-medium">
                                                {change.to}
                                            </span>
                                            {change.from
                                                ? ` (depuis ${change.from})`
                                                : ''}
                                            {' · '}
                                            {dateTime.format(
                                                new Date(change.at),
                                            )}
                                            {change.by ? ` · ${change.by}` : ''}
                                        </span>
                                        <span
                                            aria-hidden
                                            className="bg-border h-px min-w-4 flex-1"
                                        />
                                    </MessageScrollerItem>
                                );
                            }

                            const first = group.notes[0];
                            const last = group.notes.at(-1);
                            const mine = first?.mine ?? false;
                            const when = last?.at
                                ? dateTime.format(new Date(last.at))
                                : null;

                            return (
                                <MessageScrollerItem
                                    key={group.key}
                                    messageId={group.key}
                                    scrollAnchor={mine}
                                    role="listitem"
                                    data-kind="note"
                                    data-mine={mine ? 'true' : undefined}
                                >
                                    <Message align={mine ? 'end' : 'start'}>
                                        <MessageAvatar className="group-has-data-[slot=message-footer]/message:-translate-y-4">
                                            <Avatar>
                                                {first?.avatar && (
                                                    <AvatarImage
                                                        src={first.avatar}
                                                        alt={group.author}
                                                    />
                                                )}
                                                <AvatarFallback>
                                                    {initials(group.author)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </MessageAvatar>
                                        <MessageContent className="gap-0.5">
                                            <BubbleGroup className="gap-0.5">
                                                {group.notes.map((note) => (
                                                    <NoteBubble
                                                        key={note.id}
                                                        note={note}
                                                        mine={mine}
                                                        leadUuid={leadUuid}
                                                        staffNames={staffNames}
                                                    />
                                                ))}
                                            </BubbleGroup>
                                            {when && (
                                                <MessageFooter className="h-4 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 motion-reduce:transition-none">
                                                    {mine
                                                        ? when
                                                        : `${group.author} · ${when}`}
                                                </MessageFooter>
                                            )}
                                        </MessageContent>
                                    </Message>
                                </MessageScrollerItem>
                            );
                        })}
                    </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton aria-label="Aller à la dernière activité" />
            </MessageScroller>
        </MessageScrollerProvider>
    );
}
