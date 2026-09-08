import {
    arrivalLabel,
    arrivalProgress,
    type ArrivalTone,
} from '@/lib/arrival-progress';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Barre et texte par palier : vert loin de l'arrivée, rouge à moins d'une semaine ou une fois arrivé. */
const barTones: Record<ArrivalTone, string> = {
    none: 'bg-muted-foreground/30',
    green: 'bg-emerald-500',
    yellow: 'bg-yellow-400',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
};

const textTones: Record<ArrivalTone, string> = {
    none: 'text-muted-foreground',
    green: 'text-emerald-700 dark:text-emerald-300',
    yellow: 'text-yellow-700 dark:text-yellow-300',
    amber: 'text-amber-700 dark:text-amber-300',
    orange: 'text-orange-700 dark:text-orange-300',
    red: 'text-red-700 dark:text-red-300',
};

/**
 * Barre d'avancement d'un dossier vers la date d'arrivée : date et compte à
 * rebours au-dessus, barre teintée comme une alerte progressive (vert quand
 * l'arrivée est loin, jaune, ambre, orange, puis rouge à moins d'une semaine
 * ou une fois arrivé).
 */
export function ArrivalProgress({
    convertedAt,
    arrivalAt,
    now,
}: {
    convertedAt: string | null;
    arrivalAt: string | null;
    now?: Date;
}) {
    const progress = arrivalProgress(convertedAt, arrivalAt, now);
    const label = arrivalLabel(progress);

    return (
        <div
            className="grid min-w-36 gap-1.5"
            data-state={progress.state}
            data-tone={progress.tone}
        >
            <div className="flex items-baseline justify-between gap-2 text-xs">
                <span
                    className={cn(
                        'font-medium tabular-nums',
                        progress.state === 'unknown' && 'text-muted-foreground',
                    )}
                >
                    {arrivalAt ? formatDate(arrivalAt) : '—'}
                </span>
                <span
                    className={cn(
                        'font-medium tabular-nums',
                        textTones[progress.tone],
                    )}
                >
                    {label}
                </span>
            </div>
            <div
                role="progressbar"
                aria-label="Avancement vers l’arrivée"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                aria-valuetext={label}
                className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
            >
                <div
                    className={cn(
                        'h-full rounded-full transition-[width] duration-300',
                        barTones[progress.tone],
                    )}
                    style={{ width: `${progress.percent}%` }}
                />
            </div>
        </div>
    );
}
