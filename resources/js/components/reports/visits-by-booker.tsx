import { Panel } from '@/components/panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { formatDate } from '@/lib/format';
import type { ReportBooker } from '@/types';

/** « 1 visite », « 3 visites ». */
function plural(count: number, word: string): string {
    return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/** Part d'une ligne dans le total, en pourcentage entier. */
export function bookerShare(total: number, overall: number): number {
    return overall === 0 ? 0 : Math.round((total / overall) * 100);
}

/**
 * Qui a réservé les visites de la période : une ligne par membre, avatar devant
 * le nom, barre proportionnelle au plus actif, et le détail effectuées /
 * annulées en clair à droite. Classement décroissant.
 */
export function VisitsByBooker({
    bookers,
    from,
    to,
}: {
    bookers: ReportBooker[];
    /** Bornes de la période du rapport, rappelées dans la carte. */
    from: string;
    to: string;
}) {
    const initials = useInitials();
    const top = Math.max(1, ...bookers.map((booker) => booker.total));
    const overall = bookers.reduce((sum, booker) => sum + booker.total, 0);

    return (
        <Panel
            title="Visites réservées par membre"
            description={`Qui a créé les visites du ${formatDate(from)} au ${formatDate(to)}, annulées comprises.`}
            action={
                <p className="text-right text-sm">
                    <span className="text-2xl font-semibold">{overall}</span>{' '}
                    <span className="text-muted-foreground">
                        {overall > 1 ? 'visites' : 'visite'}
                    </span>
                </p>
            }
        >
            {bookers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucune visite réservée sur cette période.
                </p>
            ) : (
                <ul role="list" className="grid gap-3">
                    {bookers.map((booker) => (
                        <li
                            key={booker.name}
                            className="bg-background grid gap-2 rounded-lg border p-3"
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="size-8">
                                    {booker.avatar && (
                                        <AvatarImage
                                            src={booker.avatar}
                                            alt=""
                                        />
                                    )}
                                    <AvatarFallback className="text-xs">
                                        {initials(booker.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {booker.name}
                                </span>
                                <span className="shrink-0 text-sm tabular-nums">
                                    <span className="font-semibold">
                                        {booker.total}
                                    </span>{' '}
                                    <span className="text-muted-foreground">
                                        {booker.total > 1
                                            ? 'réservées'
                                            : 'réservée'}
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    aria-hidden="true"
                                    className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
                                >
                                    <span
                                        className="bg-chart-1 block h-full rounded-full"
                                        style={{
                                            width: `${(booker.total / top) * 100}%`,
                                        }}
                                    />
                                </span>
                                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                    {bookerShare(booker.total, overall)} % ·{' '}
                                    {plural(booker.done, 'effectuée')} ·{' '}
                                    {plural(booker.cancelled, 'annulée')}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}
