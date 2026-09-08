import { router } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    /** État connu côté serveur. */
    favorite: boolean;
    /** Route de bascule (POST), ex. `agents.favorite`. */
    url: string;
    /** Nom du sujet pour l'accessibilité (« Ajouter Zoé Martin aux favoris »). */
    name: string;
    size?: 'sm' | 'md';
    className?: string;
};

/**
 * Étoile de favori personnel : bascule immédiate à l'écran, puis POST sur la
 * route de bascule ; l'état revient à celui du serveur au rechargement.
 */
export function FavoriteButton({
    favorite,
    url,
    name,
    size = 'sm',
    className,
}: Props) {
    const [active, setActive] = useState(favorite);
    useEffect(() => setActive(favorite), [favorite]);

    const toggle = () => {
        const next = !active;
        setActive(next);
        router.post(
            url,
            {},
            { preserveScroll: true, onError: () => setActive(!next) },
        );
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-pressed={active}
            aria-label={
                active
                    ? `Retirer ${name} des favoris`
                    : `Ajouter ${name} aux favoris`
            }
            title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={toggle}
            className={cn(
                'text-muted-foreground hover:text-amber-500',
                size === 'sm' && 'size-8',
                active && 'text-amber-500 hover:text-amber-600',
                className,
            )}
        >
            <Star aria-hidden className={cn(active && 'fill-current')} />
        </Button>
    );
}
