import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Étoile posée à côté d'un nom : signale un favori personnel, sans être
 * cliquable. La bascule vit dans le menu « ⋯ » de la ligne ou de la fiche.
 */
export function FavoriteStar({
    favorite,
    className,
}: {
    favorite: boolean;
    className?: string;
}) {
    if (!favorite) {
        return null;
    }

    return (
        <Star
            role="img"
            aria-label="Favori"
            className={cn(
                'size-3.5 shrink-0 fill-amber-400 text-amber-500',
                className,
            )}
        />
    );
}
