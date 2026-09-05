import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Barre d'actions d'un formulaire long : collée en bas de l'écran, fond
 * blanc et filet supérieur d'un bord à l'autre ; les boutons, eux, restent
 * alignés sur la largeur maximale de la page.
 */
export function FormActionBar({
    children,
    className,
    innerClassName = 'max-w-7xl',
}: {
    children: ReactNode;
    className?: string;
    /** Largeur maximale du contenu, à faire correspondre à celle de la page. */
    innerClassName?: string;
}) {
    return (
        <div
            role="toolbar"
            aria-label="Actions du formulaire"
            className={cn(
                'bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-20 mt-4 w-full border-t backdrop-blur',
                className,
            )}
        >
            <div
                className={cn(
                    'mx-auto flex w-full items-center justify-end gap-2 px-4 py-3',
                    innerClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
}
