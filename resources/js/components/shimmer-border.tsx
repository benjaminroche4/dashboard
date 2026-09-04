import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    children: ReactNode;
    className?: string;
    /** Rayon du cadre (le contenu doit avoir un rayon légèrement inférieur). */
    radiusClassName?: string;
};

/**
 * Liseré lumineux animé : un dégradé conique tourne derrière le contenu,
 * seul 1 px dépasse. Respecte prefers-reduced-motion (liseré fixe).
 */
export default function ShimmerBorder({
    children,
    className,
    radiusClassName = 'rounded-lg',
}: Props) {
    return (
        <div
            className={cn(
                'relative inline-flex overflow-hidden p-px',
                radiusClassName,
                'before:absolute before:inset-[-100%] before:bg-[conic-gradient(from_0deg,transparent_0deg,transparent_240deg,var(--color-rose-300)_290deg,var(--color-white)_320deg,var(--color-rose-300)_350deg,transparent_360deg)]',
                'before:animate-[spin_3s_linear_infinite] motion-reduce:before:animate-none',
                'dark:before:bg-[conic-gradient(from_0deg,transparent_0deg,transparent_240deg,var(--color-rose-400)_290deg,var(--color-white)_320deg,var(--color-rose-400)_350deg,transparent_360deg)]',
                className,
            )}
        >
            <div className={cn('bg-background relative', radiusClassName)}>
                {children}
            </div>
        </div>
    );
}
