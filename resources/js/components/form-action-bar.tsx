import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Barre d'actions d'un formulaire long : collée en bas de l'écran, fond
 * blanc et filet supérieur, elle reste visible pendant le défilement.
 */
export function FormActionBar({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            role="toolbar"
            aria-label="Actions du formulaire"
            className={cn(
                'bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-20 -mx-4 mt-4 flex items-center justify-end gap-2 border-t px-4 py-3 backdrop-blur',
                className,
            )}
        >
            {children}
        </div>
    );
}
