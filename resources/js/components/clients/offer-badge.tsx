import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OfferValue } from '@/types';

/**
 * Teinte par formule : « Confié » en bleu, « Accompagné » en jaune. Deux
 * couleurs franches, reconnues d'un coup d'œil en balayant une liste.
 */
export const offerTones: Record<OfferValue, string> = {
    accompagne:
        'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    confie: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
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
