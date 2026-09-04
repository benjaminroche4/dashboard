import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Logo avec un reflet qui le balaie périodiquement et un halo léger qui
 * respire. Styles dans app.css (`shimmer-logo`), désactivés en reduced-motion.
 */
export default function ShimmerLogo({
    className,
    alt = 'Dashboard',
    ...props
}: ComponentProps<'img'>) {
    return (
        <span className={cn('shimmer-logo inline-flex rounded-md', className)}>
            <img {...props} alt={alt} className="size-10 rounded-md" />
        </span>
    );
}
