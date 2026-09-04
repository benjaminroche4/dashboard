import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export type Notification = {
    id: string | number;
    title: string;
    description?: string;
    at: string;
    read?: boolean;
};

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
                    <ul
                        role="list"
                        className="max-h-80 divide-y overflow-y-auto"
                    >
                        {items.map((item) => (
                            <li
                                key={item.id}
                                className={`px-4 py-3 text-sm ${item.read ? '' : 'bg-accent/40'}`}
                            >
                                <p className="font-medium">{item.title}</p>
                                {item.description && (
                                    <p className="text-muted-foreground text-pretty">
                                        {item.description}
                                    </p>
                                )}
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {item.at}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    );
}
