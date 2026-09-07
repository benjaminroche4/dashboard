import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OwnerStatus } from '@/types';

export const ownerStatusTones: Record<OwnerStatus, string> = {
    to_contact:
        'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    contacted: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    interested:
        'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    mandate: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    declined:
        'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

export function OwnerStatusBadge({
    status,
    label,
}: {
    status: OwnerStatus;
    label: string;
}) {
    return (
        <Badge
            variant="secondary"
            data-status={status}
            className={cn('font-medium', ownerStatusTones[status])}
        >
            {label}
        </Badge>
    );
}
