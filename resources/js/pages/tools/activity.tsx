import { Head, Link, router } from '@inertiajs/react';
import { CalendarRange, History } from 'lucide-react';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { PaginationBar } from '@/components/pagination-bar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { show as leadShow } from '@/routes/leads';
import { index as toolsIndex } from '@/routes/tools';
import { index as activityIndex } from '@/routes/tools/activity';
import type {
    Activity,
    ActivityFilters,
    ActivityLead,
    ActivityMember,
    ActivityPage,
    ActivityPeriodOption,
    ActivityResourceOption,
} from '@/types';

type Props = {
    activities: ActivityPage;
    members: ActivityMember[];
    resources: ActivityResourceOption[];
    periods: ActivityPeriodOption[];
    filters: ActivityFilters;
    /** Lead filtré (`?lead=UUID`), pour l'en-tête. */
    lead: ActivityLead | null;
};

/** Valeur « Tous » des sélecteurs (un `SelectItem` n'accepte pas la chaîne vide). */
const ALL = 'all';

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

function dayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** « Aujourd'hui », « Hier », puis « lundi 7 septembre 2026 » en capitale. */
export function dayLabel(iso: string, now = new Date()): string {
    const date = new Date(iso);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (dayKey(date) === dayKey(now)) {
        return "Aujourd'hui";
    }
    if (dayKey(date) === dayKey(yesterday)) {
        return 'Hier';
    }

    const label = dayFormat.format(date);

    return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Regroupe les entrées par jour, dans l'ordre reçu (du plus récent au plus ancien). */
export function groupByDay(
    activities: Activity[],
    now = new Date(),
): { label: string; items: Activity[] }[] {
    const groups: { label: string; items: Activity[] }[] = [];

    for (const activity of activities) {
        const label = dayLabel(activity.created_at, now);
        const last = groups[groups.length - 1];

        if (last && last.label === label) {
            last.items.push(activity);
        } else {
            groups.push({ label, items: [activity] });
        }
    }

    return groups;
}

export default function ActivityIndex({
    activities,
    members,
    resources,
    periods,
    filters,
    lead,
}: Props) {
    const groups = groupByDay(activities.data);

    const visit = (
        changes: Partial<{
            period: string;
            member: string;
            resource: string;
            page: number;
        }>,
    ) => {
        const query: Record<string, string | number> = {};
        const period = changes.period ?? filters.period;
        const member =
            changes.member ?? (filters.member ? String(filters.member) : ALL);
        const resource = changes.resource ?? filters.resource ?? ALL;

        query.period = period;
        if (member !== ALL) {
            query.member = member;
        }
        if (resource !== ALL) {
            query.resource = resource;
        }
        if (filters.lead) {
            query.lead = filters.lead;
        }
        if (changes.page && changes.page > 1) {
            query.page = changes.page;
        }

        router.get(
            activityIndex({ query }).url,
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Journal d'activité" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-10">
                <div className="grid gap-4 pt-8">
                    <div>
                        <h1 className="text-lg font-medium">
                            Journal d'activité
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {lead ? (
                                <>
                                    Les actions de l'équipe sur le dossier de{' '}
                                    <Link
                                        href={leadShow({ lead: lead.uuid })}
                                        className="text-foreground underline-offset-4 hover:underline"
                                    >
                                        {lead.name}
                                    </Link>
                                    .{' '}
                                    <Link
                                        href={activityIndex()}
                                        className="underline-offset-4 hover:underline"
                                    >
                                        Tout le journal
                                    </Link>
                                </>
                            ) : (
                                "Toutes les actions de l'équipe, des plus récentes aux plus anciennes."
                            )}
                        </p>
                    </div>
                    <div className="bg-sidebar flex flex-wrap items-center gap-2 rounded-xl border p-2">
                        <Select
                            value={filters.period}
                            onValueChange={(period) => visit({ period })}
                        >
                            <SelectTrigger
                                aria-label="Période"
                                className="bg-background w-44"
                            >
                                <CalendarRange
                                    aria-hidden="true"
                                    className="size-4 opacity-60"
                                />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {periods.map((period) => (
                                    <SelectItem
                                        key={period.value}
                                        value={period.value}
                                    >
                                        {period.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={
                                filters.member ? String(filters.member) : ALL
                            }
                            onValueChange={(member) => visit({ member })}
                        >
                            <SelectTrigger
                                aria-label="Membre"
                                className="bg-background w-44"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Tous les membres
                                </SelectItem>
                                {members.map((member) => (
                                    <SelectItem
                                        key={member.id}
                                        value={String(member.id)}
                                    >
                                        {member.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.resource ?? ALL}
                            onValueChange={(resource) => visit({ resource })}
                        >
                            <SelectTrigger
                                aria-label="Ressource"
                                className="bg-background w-44"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Toutes les ressources
                                </SelectItem>
                                {resources.map((resource) => (
                                    <SelectItem
                                        key={resource.value}
                                        value={resource.value}
                                    >
                                        {resource.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground ml-auto px-2 text-xs tabular-nums">
                            {activities.total}{' '}
                            {activities.total > 1 ? 'entrées' : 'entrée'}
                        </p>
                    </div>
                </div>

                {activities.data.length === 0 ? (
                    <div className="bg-sidebar text-muted-foreground flex flex-col items-center gap-2 rounded-xl border px-4 py-12 text-center text-sm">
                        <History aria-hidden="true" className="size-6" />
                        Aucune activité sur cette période.
                    </div>
                ) : (
                    <ActivityFeed groups={groups} />
                )}

                <PaginationBar
                    page={activities.current_page}
                    lastPage={activities.last_page}
                    onPage={(page) => visit({ page })}
                />
            </div>
        </>
    );
}

ActivityIndex.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: "Journal d'activité", href: activityIndex() },
    ],
};
