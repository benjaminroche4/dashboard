import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Contact, History } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { activityIcon, activityTone } from '@/lib/activity-resources';
import { cn } from '@/lib/utils';
import { show as leadShow } from '@/routes/leads';
import type { Activity } from '@/types';

export type ActivityGroup = { label: string; items: Activity[] };

const timeFormat = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
});

/** Une entrée : avatar de l'acteur signé par l'icône de la ressource. */
function ActivityRow({ activity }: { activity: Activity }) {
    const initials = useInitials();
    const actorName = activity.actor?.name ?? 'Le système';
    const tone = activityTone(activity.resource);
    const Icon = activityIcon(activity.resource);

    return (
        <li className="hover:bg-muted/40 flex items-start gap-3 px-4 py-3 text-sm transition-colors">
            <span className="relative mt-0.5 shrink-0">
                <Avatar className="size-8">
                    {activity.actor?.avatar && (
                        <AvatarImage src={activity.actor.avatar} alt="" />
                    )}
                    <AvatarFallback className="text-[10px]">
                        {activity.actor ? (
                            initials(actorName)
                        ) : (
                            <History aria-hidden="true" className="size-3" />
                        )}
                    </AvatarFallback>
                </Avatar>
                <span
                    aria-hidden="true"
                    className={cn(
                        'ring-sidebar absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full ring-2',
                        tone.soft,
                        tone.text,
                    )}
                >
                    <Icon className="size-2.5" />
                </span>
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
                <p className="leading-snug">
                    <span className="font-medium">{actorName}</span>{' '}
                    {activity.message}
                </p>
                <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <time
                        dateTime={activity.created_at}
                        className="tabular-nums"
                    >
                        {timeFormat.format(new Date(activity.created_at))}
                    </time>
                    <span aria-hidden="true">·</span>
                    <span className={tone.text}>{activity.resource_label}</span>
                    {activity.lead && (
                        <Link
                            href={leadShow({ lead: activity.lead.uuid })}
                            className="bg-muted hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors"
                        >
                            <Contact aria-hidden="true" className="size-3" />
                            {activity.lead.name}
                        </Link>
                    )}
                </p>
            </div>
        </li>
    );
}

/**
 * Un groupe du journal : au-delà de `collapseAfter` entrées, le reste est
 * replié derrière un bouton pour ne pas noyer la page.
 */
function ActivityGroupSection({
    group,
    collapseAfter,
}: {
    group: ActivityGroup;
    collapseAfter?: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const collapsible =
        collapseAfter !== undefined && group.items.length > collapseAfter;
    const visible =
        collapsible && !expanded
            ? group.items.slice(0, collapseAfter)
            : group.items;
    const hidden = group.items.length - visible.length;

    return (
        <section aria-label={group.label} className="grid gap-2">
            <div className="flex items-center gap-3">
                <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {group.label}
                </h2>
                <span aria-hidden="true" className="bg-border h-px flex-1" />
                {collapsible && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                        {group.items.length}
                    </span>
                )}
            </div>
            <ol
                role="list"
                className="bg-sidebar divide-y overflow-hidden rounded-xl border"
            >
                {visible.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                ))}
                {collapsible && (
                    <li>
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                            className="text-muted-foreground hover:bg-muted/40 hover:text-foreground flex w-full items-center justify-center gap-1.5 px-4 py-2 text-xs transition-colors"
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp
                                        aria-hidden
                                        className="size-3.5"
                                    />
                                    Réduire
                                </>
                            ) : (
                                <>
                                    <ChevronDown
                                        aria-hidden
                                        className="size-3.5"
                                    />
                                    Voir les {hidden} autres
                                </>
                            )}
                        </button>
                    </li>
                )}
            </ol>
        </section>
    );
}

/** Le journal, une carte par jour précédée de son intitulé. */
export function ActivityFeed({
    groups,
    collapseAfter,
}: {
    groups: ActivityGroup[];
    /** Nombre d'entrées visibles avant le repli ; sans lui, tout est affiché. */
    collapseAfter?: number;
}) {
    return (
        <div className="grid gap-6">
            {groups.map((group) => (
                <ActivityGroupSection
                    key={group.label}
                    group={group}
                    collapseAfter={collapseAfter}
                />
            ))}
        </div>
    );
}
