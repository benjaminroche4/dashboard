import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    children: ReactNode;
    className?: string;
};

/**
 * Liseré lumineux animé autour du contenu : un anneau de 1,5 px parcouru par
 * un éclat bordeaux, avec un halo léger. Le rayon suit celui du wrapper via
 * `className` (ex. rounded-md). Styles dans app.css (`shimmer-border`).
 */
export default function ShimmerBorder({ children, className }: Props) {
    return (
        <div className={cn('shimmer-border inline-flex', className)}>
            {children}
        </div>
    );
}
