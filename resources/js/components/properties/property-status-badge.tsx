import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PropertyStatus } from '@/types';

/** Teinte par disponibilité : vert disponible, ambre sous option, gris loué, orange en travaux, rouge non disponible. */
export const propertyStatusTones: Record<PropertyStatus, string> = {
    available:
        'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    under_offer:
        'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    rented: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
    under_renovation:
        'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    unavailable: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

/** Pastille pleine de la même couleur, pour les listes et les menus. */
export const propertyStatusDots: Record<PropertyStatus, string> = {
    available: 'bg-green-500',
    under_offer: 'bg-amber-500',
    rented: 'bg-neutral-400',
    under_renovation: 'bg-orange-500',
    unavailable: 'bg-red-500',
};

export function PropertyStatusBadge({
    status,
    label,
    className,
}: {
    status: PropertyStatus;
    label: string;
    className?: string;
}) {
    return (
        <Badge
            variant="secondary"
            data-status={status}
            className={cn(
                'font-medium',
                propertyStatusTones[status],
                className,
            )}
        >
            {label}
        </Badge>
    );
}
