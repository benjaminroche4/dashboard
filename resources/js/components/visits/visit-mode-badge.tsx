import { House, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VisitModeValue } from '@/types';

/**
 * Qui réalise la visite : un membre de l'équipe, ou le client seul (visite
 * autonome, réservée à la formule Accompagné). La formule du client n'entre
 * pas en ligne de compte : seul compte le mode choisi sur la visite.
 */
export function VisitModeBadge({
    mode,
    className,
}: {
    mode: VisitModeValue;
    className?: string;
}) {
    const alone = mode === 'client_alone';
    const Icon = alone ? UserRound : House;

    return (
        <Badge
            variant="outline"
            className={cn(
                'gap-1 py-0.5 pr-2 pl-1 font-normal',
                alone
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300',
                className,
            )}
        >
            <Icon aria-hidden className="size-3" />
            {alone ? 'Visite autonome' : 'Par l’équipe'}
        </Badge>
    );
}
