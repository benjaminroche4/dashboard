import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettle } from '@/hooks/use-settle';
import { clearMissedEvents, useMissedEvents } from '@/lib/missed-events';
import { cn } from '@/lib/utils';
import { index as activityIndex } from '@/routes/tools/activity';

/**
 * La cloche de l'en-tête : le nombre d'actions des collègues passées en
 * silence depuis la dernière consultation, et le chemin vers le journal
 * pour les retrouver. Un clic remet le compteur à zéro.
 */
export function ActivityBell() {
    const missed = useMissedEvents();
    // La pastille se pose à chaque incrément : la cloche se remarque.
    const settling = useSettle(missed);
    const label =
        missed === 0
            ? 'Journal d’activité'
            : `${missed} action${missed > 1 ? 's' : ''} de l’équipe depuis votre dernière consultation`;

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={label}
            title={label}
            asChild
        >
            <Link href={activityIndex()} onClick={clearMissedEvents}>
                <Bell aria-hidden />
                {missed > 0 && (
                    <span
                        aria-hidden
                        className={cn(
                            'bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums',
                            settling &&
                                'animate-settle motion-reduce:animate-none',
                        )}
                    >
                        {missed > 99 ? '99+' : missed}
                    </span>
                )}
            </Link>
        </Button>
    );
}
