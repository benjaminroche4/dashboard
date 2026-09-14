import { Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { firstContactLabel, type FirstContactTimer } from '@/lib/lead-urgency';
import { useSettle } from '@/hooks/use-settle';
import { cn } from '@/lib/utils';

/**
 * Chrono en direct du premier contact d'un nouveau lead : ambre tant que les 30 minutes
 * défilent, rouge une fois le délai passé (le retard continue de compter). Ne rend rien sans chrono.
 */
export function FirstContactBadge({
    timer,
    className,
}: {
    timer: FirstContactTimer | null;
    className?: string;
}) {
    // Une seule pulsation au passage des 30 minutes : le chrono qui vire au
    // rouge se remarque, sans clignoter ensuite.
    const crossed =
        useSettle(timer?.late ?? false, 700) && timer?.late === true;

    if (timer === null) {
        return null;
    }

    return (
        <Badge
            variant="secondary"
            role="timer"
            aria-live="off"
            data-urgency="first-contact"
            data-late={timer.late ? 'true' : 'false'}
            className={cn(
                'gap-1 py-0.5 pr-2 pl-1.5 tabular-nums',
                crossed && 'animate-pulse-once motion-reduce:animate-none',
                timer.late
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                className,
            )}
        >
            <Timer className="size-3" aria-hidden />
            {firstContactLabel(timer)}
        </Badge>
    );
}
