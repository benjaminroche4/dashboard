import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    active: boolean;
    onChange: (active: boolean) => void;
    /** Nombre de favoris, affiché entre parenthèses. */
    count: number;
};

/** Bouton « Favoris (n) » qui restreint une liste aux éléments étoilés. */
export function FavoritesFilter({ active, onChange, count }: Props) {
    return (
        <Button
            type="button"
            variant="outline"
            aria-pressed={active}
            onClick={() => onChange(!active)}
            className={cn(
                active &&
                    'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900',
            )}
        >
            <Star aria-hidden className={cn(active && 'fill-current')} />
            Favoris ({count})
        </Button>
    );
}
