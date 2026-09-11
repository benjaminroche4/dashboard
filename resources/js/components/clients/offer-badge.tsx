import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OfferValue } from '@/types';

/**
 * Teinte par formule : deux nuances proches et discrètes, juste assez
 * différentes pour distinguer les deux offres en balayant une liste.
 */
export const offerTones: Record<OfferValue, string> = {
    accompagne: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    confie: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
};

/** Formule d'un lead ou d'un client (« Accompagné », « Confié »). */
export function OfferBadge({
    offer,
    label,
    className,
}: {
    offer: OfferValue | null;
    label: string | null;
    className?: string;
}) {
    if (label === null) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <Badge
            variant="secondary"
            className={cn(
                'font-medium',
                offer !== null && offerTones[offer],
                className,
            )}
        >
            {label}
        </Badge>
    );
}
