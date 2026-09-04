import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * Bandeau d'erreur aux couleurs personnalisées (rouge doux, adapté au thème sombre).
 */
export default function AlertError({
    errors,
    title,
    className,
}: {
    errors: string[];
    title?: string;
    className?: string;
}) {
    return (
        <Alert
            className={cn(
                'border-red-200 bg-red-50 text-red-900 *:data-[slot=alert-description]:text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-50 dark:*:data-[slot=alert-description]:text-red-200',
                className,
            )}
        >
            <AlertCircleIcon />
            <AlertTitle>{title || 'Une erreur est survenue.'}</AlertTitle>
            <AlertDescription>
                <ul className="list-inside list-disc text-sm">
                    {Array.from(new Set(errors)).map((error, index) => (
                        <li key={index}>{error}</li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
}
