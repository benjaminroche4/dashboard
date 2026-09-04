import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Drapeau SVG rond (bibliothèque flag-icons), globe pour un pays inconnu.
 */
export function CountryFlag({
    code,
    className,
}: {
    code: string | null | undefined;
    className?: string;
}) {
    if (!code || code.length !== 2) {
        return (
            <span
                aria-hidden="true"
                className={cn(
                    'bg-muted text-muted-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-full',
                    className,
                )}
            >
                <Globe className="size-3" />
            </span>
        );
    }

    return (
        <span
            aria-hidden="true"
            data-country={code.toUpperCase()}
            className={cn(
                'fi fis inline-block size-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]',
                `fi-${code.toLowerCase()}`,
                className,
            )}
        />
    );
}
