import { router } from '@inertiajs/react';
import { Check, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Menu « ⋯ » d'une ligne qui n'a qu'une action : mettre en favoris, ou l'en
 * retirer. Le favori se signale à côté du nom par `FavoriteStar` ; la bascule
 * vit dans le menu, comme sur les listes et les fiches de l'annuaire.
 */
export function FavoriteMenu({
    name,
    favorite,
}: {
    /** Nom de l'élément, pour l'intitulé accessible du bouton. */
    name: string;
    /** État courant et route de bascule (POST). */
    favorite: { active: boolean; url: string };
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label={`Actions pour ${name}`}
                >
                    <MoreHorizontal aria-hidden />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    className="justify-between"
                    onSelect={() =>
                        router.post(favorite.url, {}, { preserveScroll: true })
                    }
                >
                    Favoris
                    {favorite.active && (
                        <Check aria-hidden className="text-muted-foreground" />
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
