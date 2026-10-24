import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { ActivityRow } from '@/components/activity/activity-feed';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useSettle } from '@/hooks/use-settle';
import { clearMissedEvents, useMissedEvents } from '@/lib/missed-events';
import { cn } from '@/lib/utils';
import {
    index as activityIndex,
    recent as activityRecent,
} from '@/routes/tools/activity';
import type { Activity } from '@/types';

type Feed =
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'ready'; items: Activity[] }
    | { state: 'closed' }
    | { state: 'error' };

/** Les dernières actions ; 403 = journal fermé au membre, toute autre panne = erreur lisible. */
async function loadRecent(): Promise<Feed> {
    try {
        const response = await fetch(activityRecent().url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        });

        if (response.status === 403) {
            return { state: 'closed' };
        }

        if (!response.ok) {
            return { state: 'error' };
        }

        const items = (await response.json()) as unknown;

        return { state: 'ready', items: Array.isArray(items) ? items : [] };
    } catch {
        return { state: 'error' };
    }
}

/**
 * La cloche de l'en-tête : une pastille rouge dès qu'une action des collègues
 * est passée en silence depuis la dernière consultation (le nombre est dans le
 * libellé), et, au clic, un menu avec les dernières actions de l'équipe.
 * Ouvrir le menu remet le compteur à zéro ; le journal complet reste à un lien.
 */
export function ActivityBell() {
    const missed = useMissedEvents();
    const [open, setOpen] = useState(false);
    const [feed, setFeed] = useState<Feed>({ state: 'idle' });
    // La pastille se pose à chaque nouvel événement : la cloche se remarque.
    const settling = useSettle(missed);
    const label =
        missed === 0
            ? 'Dernières actions de l’équipe'
            : `${missed} action${missed > 1 ? 's' : ''} de l’équipe depuis votre dernière consultation`;

    const onOpenChange = (next: boolean) => {
        setOpen(next);

        if (!next) {
            return;
        }

        clearMissedEvents();
        setFeed({ state: 'loading' });
        void loadRecent().then(setFeed);
    };

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={label}
                    title={label}
                >
                    <Bell aria-hidden />
                    {/* Une pastille rouge, sans chiffre : il y a du nouveau
                        qu'on n'a pas vu. Le nombre reste dans le libellé. */}
                    {missed > 0 && (
                        <span
                            aria-hidden
                            data-missed={missed}
                            className={cn(
                                'ring-background absolute top-1 right-1 size-2 rounded-full bg-red-500 ring-2',
                                settling &&
                                    'animate-settle motion-reduce:animate-none',
                            )}
                        />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[22rem] max-w-[calc(100vw-2rem)] p-0"
            >
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <h2 className="text-sm font-medium">Dernières actions</h2>
                    <Link
                        href={activityIndex()}
                        onClick={() => setOpen(false)}
                        className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                    >
                        Tout le journal
                    </Link>
                </div>
                <FeedBody feed={feed} />
            </PopoverContent>
        </Popover>
    );
}

function FeedBody({ feed }: { feed: Feed }) {
    if (feed.state === 'idle' || feed.state === 'loading') {
        return (
            <p
                role="status"
                className="text-muted-foreground px-4 py-6 text-center text-sm"
            >
                Chargement…
            </p>
        );
    }

    if (feed.state === 'closed') {
        return (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                Le journal d’activité n’est pas ouvert à votre compte.
            </p>
        );
    }

    if (feed.state === 'error') {
        return (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                Impossible de charger les dernières actions.
            </p>
        );
    }

    if (feed.items.length === 0) {
        return (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                Aucune action pour l’instant.
            </p>
        );
    }

    return (
        <ul
            aria-label="Dernières actions"
            className="max-h-[60vh] divide-y overflow-y-auto"
        >
            {feed.items.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
            ))}
        </ul>
    );
}
