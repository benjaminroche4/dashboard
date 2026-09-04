import {
    Bell,
    BellOff,
    Check,
    CheckCheck,
    CircleCheck,
    CircleDot,
    Database,
    FileBarChart,
    KeyRound,
    Package,
    UserPlus,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

export type NotificationKind =
    | 'order'
    | 'staff'
    | 'report'
    | 'security'
    | 'system';

export type Notification = {
    id: string | number;
    kind?: NotificationKind;
    /** Auteur de l'action (membre du staff ou système). */
    actor: { name: string; role?: string; avatar?: string };
    /** Phrase à la 3e personne sans sujet : « a expédié la commande #42 ». */
    title: string;
    description?: string;
    at: string;
    read?: boolean;
    /** Libellé de regroupement chronologique (Aujourd'hui, Hier…). */
    group?: string;
};

const kindIcons: Record<NotificationKind, typeof Bell> = {
    order: Package,
    staff: UserPlus,
    report: FileBarChart,
    security: KeyRound,
    system: Database,
};

const kindTints: Record<NotificationKind, string> = {
    order: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    staff: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    report: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    security:
        'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    system: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

function ActorAvatar({
    actor,
    className,
}: {
    actor: Notification['actor'];
    className?: string;
}) {
    const getInitials = useInitials();

    return (
        <Avatar className={cn('size-8 rounded-md', className)}>
            <AvatarImage src={actor.avatar} alt={actor.name} />
            <AvatarFallback className="rounded-md bg-neutral-200 text-xs text-black dark:bg-neutral-700 dark:text-white">
                {getInitials(actor.name)}
            </AvatarFallback>
        </Avatar>
    );
}

function KindIcon({
    kind = 'system',
    className,
}: {
    kind?: NotificationKind;
    className?: string;
}) {
    const Icon = kindIcons[kind];

    return (
        <span
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-md',
                kindTints[kind],
                className,
            )}
        >
            <Icon className="size-4" />
        </span>
    );
}

/** Icône d'état : point pour une notification non lue, coche pour une lue. */
function ReadState({
    read,
    className,
}: {
    read?: boolean;
    className?: string;
}) {
    const Icon = read ? CircleCheck : CircleDot;

    return (
        <Icon
            aria-label={read ? 'Lue' : 'Non lue'}
            role="img"
            className={cn(
                'inline size-3 shrink-0 align-[-2px]',
                read ? 'text-muted-foreground/70' : 'text-primary',
                className,
            )}
        />
    );
}

function Option({
    label,
    hidden = false,
    children,
}: {
    label: string;
    hidden?: boolean;
    children: ReactNode;
}) {
    return (
        <div data-uidotsh-option={label} className="contents" hidden={hidden}>
            {children}
        </div>
    );
}

function groupBy(items: Notification[]): [string, Notification[]][] {
    const groups = new Map<string, Notification[]>();

    for (const item of items) {
        const key = item.group ?? 'Autres';
        groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return Array.from(groups.entries());
}

/**
 * Cloche de l'en-tête : compteur des non-lues et liste dans un popover.
 * Les notifications viendront des événements temps réel (DashboardUpdated).
 */
export function Notifications({ items = [] }: { items?: Notification[] }) {
    const unread = items.filter((item) => !item.read).length;

    return (
        // Scaffolding picker ui.sh : ouvert au chargement pour que le picker trouve les variantes.
        <Popover defaultOpen={items.length > 0}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={
                        unread > 0
                            ? `${unread} notification(s) non lue(s)`
                            : 'Notifications'
                    }
                    data-test="notifications-trigger"
                >
                    <Bell className="size-4" />
                    {unread > 0 && (
                        <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium tabular-nums">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-80 p-0"
                // Scaffolding picker ui.sh : garder le panneau ouvert pendant la comparaison.
                onInteractOutside={(event) => event.preventDefault()}
            >
                {items.length === 0 ? (
                    <>
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <p className="text-sm font-medium">Notifications</p>
                        </div>
                        <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-8 text-center text-sm">
                            <BellOff className="size-5" />
                            Aucune notification pour le moment.
                        </div>
                    </>
                ) : (
                    <NotificationList items={items} unread={unread} />
                )}
            </PopoverContent>
        </Popover>
    );
}

function Header({
    unread,
    className,
    action,
}: {
    unread: number;
    className?: string;
    action?: ReactNode;
}) {
    return (
        <div
            className={cn(
                'flex items-center justify-between border-b px-4 py-3',
                className,
            )}
        >
            <p className="text-sm font-medium">Notifications</p>
            {action ?? (
                <div className="flex items-center gap-3">
                    {unread > 0 && (
                        <span className="text-muted-foreground text-xs">
                            {unread} non lue(s)
                        </span>
                    )}
                    <MarkAllRead disabled={unread === 0} />
                </div>
            )}
        </div>
    );
}

function MarkAllRead({
    disabled = false,
    className,
}: {
    disabled?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            className={cn(
                'text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
        >
            <CheckCheck className="size-3.5" />
            Tout marquer comme lu
        </button>
    );
}

function NotificationList({
    items,
    unread,
}: {
    items: Notification[];
    unread: number;
}) {
    return (
        <div data-uidotsh-pick="Style des notifications" className="contents">
            {/* 1 — Liste simple (actuelle), avec le nom en tête de phrase */}
            <Option label="Liste simple (current)">
                <Header unread={unread} />
                <ul role="list" className="max-h-80 divide-y overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={cn(
                                'px-4 py-3 text-sm',
                                !item.read && 'bg-accent/40',
                            )}
                        >
                            <p>
                                <span className="font-medium">
                                    {item.actor.name}
                                </span>{' '}
                                {item.title}
                            </p>
                            {item.description && (
                                <p className="text-muted-foreground text-pretty">
                                    {item.description}
                                </p>
                            )}
                            <p className="text-muted-foreground mt-1 text-xs">
                                {item.at} <ReadState read={item.read} />
                            </p>
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 2 — Avatar et nom en tête */}
            <Option label="Avatar et nom" hidden>
                <Header unread={unread} />
                <ul role="list" className="max-h-80 divide-y overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={cn(
                                'flex gap-3 px-4 py-3 text-sm',
                                !item.read && 'bg-accent/40',
                            )}
                        >
                            <ActorAvatar actor={item.actor} />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-baseline justify-between gap-2">
                                    <span className="truncate font-medium">
                                        {item.actor.name}
                                    </span>
                                    <span className="text-muted-foreground shrink-0 text-xs">
                                        {item.at} <ReadState read={item.read} />
                                    </span>
                                </p>
                                <p className="text-pretty">{item.title}</p>
                                {item.description && (
                                    <p className="text-muted-foreground text-pretty">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 3 — Puce non-lue */}
            <Option label="Puce non-lue" hidden>
                <Header unread={unread} />
                <ul role="list" className="max-h-80 overflow-y-auto py-1">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="hover:bg-accent/50 flex gap-3 px-4 py-2.5 text-sm"
                        >
                            <span
                                className={cn(
                                    'mt-2 size-2 shrink-0 rounded-full',
                                    item.read ? 'bg-transparent' : 'bg-primary',
                                )}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-pretty">
                                    <span className="font-medium">
                                        {item.actor.name}
                                    </span>{' '}
                                    <span
                                        className={cn(
                                            item.read &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        {item.title}
                                    </span>
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 4 — Cartes */}
            <Option label="Cartes" hidden>
                <Header unread={unread} className="border-b-0 pb-1" />
                <ul
                    role="list"
                    className="max-h-80 space-y-2 overflow-y-auto px-3 pb-3"
                >
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={cn(
                                'rounded-lg border p-3 text-sm',
                                !item.read && 'border-primary/30 bg-accent/30',
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <ActorAvatar
                                    actor={item.actor}
                                    className="size-6 rounded-sm"
                                />
                                <span className="truncate font-medium">
                                    {item.actor.name}
                                </span>
                                <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </span>
                            </div>
                            <p className="mt-2 text-pretty">{item.title}</p>
                            {item.description && (
                                <p className="text-muted-foreground text-pretty">
                                    {item.description}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 5 — Timeline */}
            <Option label="Timeline" hidden>
                <Header unread={unread} />
                <ol
                    role="list"
                    className="before:bg-border relative max-h-80 overflow-y-auto px-4 py-3 before:absolute before:top-3 before:bottom-3 before:left-[27px] before:w-px"
                >
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="relative flex gap-4 pb-4 text-sm last:pb-0"
                        >
                            <span
                                className={cn(
                                    'ring-popover relative mt-1.5 size-3 shrink-0 rounded-full ring-4',
                                    item.read ? 'bg-border' : 'bg-primary',
                                )}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-pretty">
                                    <span className="font-medium">
                                        {item.actor.name}
                                    </span>{' '}
                                    {item.title}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
            </Option>

            {/* 6 — Groupée par jour */}
            <Option label="Groupée par jour" hidden>
                <Header unread={unread} />
                <div className="max-h-80 overflow-y-auto">
                    {groupBy(items).map(([group, groupItems]) => (
                        <section key={group}>
                            <p className="bg-muted/60 text-muted-foreground sticky top-0 px-4 py-1.5 text-xs font-medium">
                                {group}
                            </p>
                            <ul role="list" className="divide-y">
                                {groupItems.map((item) => (
                                    <li
                                        key={item.id}
                                        className="flex gap-3 px-4 py-2.5 text-sm"
                                    >
                                        <ActorAvatar
                                            actor={item.actor}
                                            className="size-7"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-pretty">
                                                <span className="font-medium">
                                                    {item.actor.name}
                                                </span>{' '}
                                                {item.title}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {item.at}{' '}
                                                <ReadState read={item.read} />
                                            </p>
                                        </div>
                                        {!item.read && (
                                            <span className="bg-primary mt-2 size-2 shrink-0 rounded-full" />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </Option>

            {/* 7 — Icône par type */}
            <Option label="Icône par type" hidden>
                <Header unread={unread} />
                <ul role="list" className="max-h-80 divide-y overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={cn(
                                'flex gap-3 px-4 py-3 text-sm',
                                !item.read && 'bg-accent/40',
                            )}
                        >
                            <KindIcon kind={item.kind} />
                            <div className="min-w-0 flex-1">
                                <p className="text-pretty">
                                    <span className="font-medium">
                                        {item.actor.name}
                                    </span>{' '}
                                    {item.title}
                                </p>
                                {item.description && (
                                    <p className="text-muted-foreground text-pretty">
                                        {item.description}
                                    </p>
                                )}
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 8 — Compacte */}
            <Option label="Compacte" hidden>
                <Header unread={unread} />
                <ul role="list" className="max-h-80 overflow-y-auto py-1">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="hover:bg-accent/50 flex items-center gap-2 px-3 py-1.5 text-sm"
                        >
                            <ActorAvatar
                                actor={item.actor}
                                className="size-6 rounded-full"
                            />
                            <p className="min-w-0 flex-1 truncate">
                                <span
                                    className={cn(
                                        'font-medium',
                                        item.read && 'font-normal',
                                    )}
                                >
                                    {item.actor.name}
                                </span>{' '}
                                <span className="text-muted-foreground">
                                    {item.title}
                                </span>
                            </p>
                            <span className="text-muted-foreground shrink-0 text-xs">
                                {item.at} <ReadState read={item.read} />
                            </span>
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 9 — Avec actions au survol */}
            <Option label="Actions au survol" hidden>
                <Header
                    unread={unread}
                    action={<MarkAllRead disabled={unread === 0} />}
                />
                <ul role="list" className="max-h-80 divide-y overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={cn(
                                'group/notif flex gap-3 px-4 py-3 text-sm',
                                !item.read && 'bg-accent/40',
                            )}
                        >
                            <ActorAvatar actor={item.actor} />
                            <div className="min-w-0 flex-1">
                                <p className="text-pretty">
                                    <span className="font-medium">
                                        {item.actor.name}
                                    </span>{' '}
                                    {item.title}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </p>
                            </div>
                            {!item.read && (
                                <button
                                    type="button"
                                    aria-label="Marquer comme lue"
                                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover/notif:opacity-100 focus-visible:opacity-100"
                                >
                                    <Check className="size-4" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 10 — Onglets Tous / Non lues */}
            <Option label="Onglets" hidden>
                <div className="flex items-center gap-1 border-b px-3 pt-2 pb-0">
                    <MarkAllRead
                        disabled={unread === 0}
                        className="order-last ml-auto pb-2"
                    />
                    <span className="border-primary -mb-px border-b-2 px-2 pb-2 text-sm font-medium">
                        Tous
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1.5 px-2 pb-2 text-sm">
                        Non lues
                        {unread > 0 && (
                            <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] font-medium tabular-nums">
                                {unread}
                            </span>
                        )}
                    </span>
                </div>
                <ul role="list" className="max-h-80 divide-y overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="flex gap-3 px-4 py-3 text-sm"
                        >
                            <ActorAvatar actor={item.actor} />
                            <div className="min-w-0 flex-1">
                                <p className="text-pretty">
                                    <span className="font-medium">
                                        {item.actor.name}
                                    </span>{' '}
                                    {item.title}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </p>
                            </div>
                            {!item.read && (
                                <span className="bg-primary mt-2 size-2 shrink-0 rounded-full" />
                            )}
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 11 — Accent bordeaux sur les non-lues */}
            <Option label="Accent bordeaux" hidden>
                <Header unread={unread} />
                <ul role="list" className="max-h-80 divide-y overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={cn(
                                'flex gap-3 border-l-2 px-4 py-3 text-sm',
                                item.read
                                    ? 'border-l-transparent'
                                    : 'border-l-[#731a2f] bg-[#731a2f]/5',
                            )}
                        >
                            <ActorAvatar
                                actor={item.actor}
                                className="rounded-full"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-pretty">
                                    <span className="font-medium">
                                        {item.actor.name}
                                    </span>{' '}
                                    {item.title}
                                </p>
                                {item.description && (
                                    <p className="text-muted-foreground text-pretty">
                                        {item.description}
                                    </p>
                                )}
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 12 — En-tête plein */}
            <Option label="En-tête plein" hidden>
                <div className="bg-primary text-primary-foreground flex items-center justify-between rounded-t-md px-4 py-3">
                    <p className="text-sm font-medium">Notifications</p>
                    <MarkAllRead
                        disabled={unread === 0}
                        className="text-primary-foreground/80 hover:text-primary-foreground"
                    />
                </div>
                <ul role="list" className="max-h-80 divide-y overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="flex gap-3 px-4 py-3 text-sm"
                        >
                            <ActorAvatar actor={item.actor} />
                            <div className="min-w-0 flex-1">
                                <p className="text-pretty">
                                    <span className="font-medium">
                                        {item.actor.name}
                                    </span>{' '}
                                    {item.title}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </p>
                            </div>
                            {!item.read && (
                                <span className="bg-primary mt-2 size-2 shrink-0 rounded-full" />
                            )}
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 13 — Bulles */}
            <Option label="Bulles" hidden>
                <Header unread={unread} />
                <ul
                    role="list"
                    className="max-h-80 space-y-3 overflow-y-auto px-4 py-3"
                >
                    {items.map((item) => (
                        <li key={item.id} className="flex gap-2 text-sm">
                            <ActorAvatar
                                actor={item.actor}
                                className="size-7 rounded-full"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-muted-foreground mb-1 text-xs">
                                    <span className="text-foreground font-medium">
                                        {item.actor.name}
                                    </span>{' '}
                                    · {item.at} <ReadState read={item.read} />
                                </p>
                                <div
                                    className={cn(
                                        'bg-muted rounded-2xl rounded-tl-sm px-3 py-2',
                                        !item.read &&
                                            'bg-primary text-primary-foreground',
                                    )}
                                >
                                    <p className="text-pretty">
                                        {item.title.charAt(0).toUpperCase() +
                                            item.title.slice(1)}
                                    </p>
                                    {item.description && (
                                        <p
                                            className={cn(
                                                'text-pretty opacity-80',
                                            )}
                                        >
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 14 — Minimal typographique */}
            <Option label="Minimal typographique" hidden>
                <Header unread={unread} className="border-b-0" />
                <ul
                    role="list"
                    className="max-h-80 space-y-4 overflow-y-auto px-4 pb-4"
                >
                    {items.map((item) => (
                        <li key={item.id} className="text-sm">
                            <p className="text-muted-foreground text-xs">
                                {item.at} <ReadState read={item.read} />
                            </p>
                            <p
                                className={cn(
                                    'text-pretty',
                                    item.read && 'text-muted-foreground',
                                )}
                            >
                                <span className="text-foreground font-medium">
                                    {item.actor.name}
                                </span>{' '}
                                {item.title}
                            </p>
                        </li>
                    ))}
                </ul>
            </Option>

            {/* 15 — Badge de rôle */}
            <Option label="Badge de rôle" hidden>
                <Header unread={unread} />
                <ul role="list" className="max-h-80 divide-y overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={cn(
                                'px-4 py-3 text-sm',
                                !item.read && 'bg-accent/40',
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <ActorAvatar
                                    actor={item.actor}
                                    className="size-6 rounded-sm"
                                />
                                <span className="truncate font-medium">
                                    {item.actor.name}
                                </span>
                                {item.actor.role && (
                                    <Badge
                                        variant="secondary"
                                        className="h-5 px-1.5 text-[10px]"
                                    >
                                        {item.actor.role}
                                    </Badge>
                                )}
                                <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                                    {item.at} <ReadState read={item.read} />
                                </span>
                            </div>
                            <p className="mt-1.5 text-pretty">{item.title}</p>
                        </li>
                    ))}
                </ul>
            </Option>
        </div>
    );
}
