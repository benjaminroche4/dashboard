import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VisitStatus } from '@/types';

export const visitStatusTones: Record<VisitStatus, string> = {
    planned: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    done: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    cancelled:
        'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

export function VisitStatusBadge({
    status,
    label,
}: {
    status: VisitStatus;
    label: string;
}) {
    return (
        <Badge
            variant="secondary"
            data-status={status}
            className={cn('font-medium', visitStatusTones[status])}
        >
            {label}
        </Badge>
    );
}
