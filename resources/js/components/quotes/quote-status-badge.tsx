import { Badge } from '@/components/ui/badge';
import type { QuoteStatus } from '@/types';

// Couleurs personnalisées (pattern « Custom Colors » de shadcn Badge), alignées sur les factures.
export const quoteStatusClasses: Record<QuoteStatus, string> = {
    draft: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    sent: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    accepted:
        'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    declined: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    expired: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    invoiced:
        'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

export function QuoteStatusBadge({
    status,
    label,
}: {
    status: QuoteStatus;
    label: string;
}) {
    return (
        <Badge
            variant="secondary"
            data-status={status}
            className={quoteStatusClasses[status]}
        >
            {label}
        </Badge>
    );
}
