import {
    Bell,
    BellOff,
    CheckCheck,
    CircleCheck,
    CircleDot,
    Database,
    FileBarChart,
    KeyRound,
    Package,
    UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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

function KindIcon({ kind = 'system' }: { kind?: NotificationKind }) {
    const Icon = kindIcons[kind];

    return (
        <span
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-md',
                kindTints[kind],
            )}
        >
            <Icon className="size-4" />
        </span>
    );
}

/** État de lecture : point plein pour une non-lue, coche pour une lue. */
function ReadState({ read }: { read?: boolean }) {
    const Icon = read ? CircleCheck : CircleDot;

    return (
        <Icon
            role="img"
            aria-label={read ? 'Lue' : 'Non lue'}
            className={cn(
                'size-4 shrink-0 self-center',
                read ? 'text-muted-foreground/60' : 'text-primary',
            )}
        />
    );
}

/**
 * Cloche de l'en-tête : compteur des non-lues et liste dans un popover.
 * Les notifications viendront des événements temps réel (DashboardUpdated).
 */
export function Notifications({ items = [] }: { items?: Notification[] }) {
    const unread = items.filter((item) => !item.read).length;

    return (
        <Popover>
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
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="text-sm font-medium">Notifications</p>
                    {unread > 0 && (
                        <span className="text-muted-foreground text-xs">
                            {unread} non lue(s)
                        </span>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-8 text-center text-sm">
                        <BellOff className="size-5" />
                        Aucune notification pour le moment.
                    </div>
                ) : (
                    <>
                        <ul
                            role="list"
                            className="max-h-80 divide-y overflow-y-auto"
                        >
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
                                            {item.at}
                                        </p>
                                    </div>
                                    <ReadState read={item.read} />
                                </li>
                            ))}
                        </ul>
                        <div className="border-t p-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                disabled={unread === 0}
                            >
                                <CheckCheck />
                                Tout marquer comme lu
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}
