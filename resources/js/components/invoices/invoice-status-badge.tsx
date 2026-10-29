import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/types';

// Couleurs personnalisées (pattern « Custom Colors » de shadcn Badge), les
// mêmes teintes que les devis : brouillon violet, envoyée bleue, payée verte,
// en retard rouge, annulée grise.
export const invoiceStatusClasses: Record<InvoiceStatus, string> = {
    paid: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    sent: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    overdue: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    draft: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    cancelled:
        'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

/** Statut d'une facture en badge teinté, partout où une facture est listée. */
export function InvoiceStatusBadge({
    status,
    label,
}: {
    status: InvoiceStatus;
    label: string;
}) {
    return (
        <Badge
            variant="secondary"
            data-status={status}
            className={invoiceStatusClasses[status]}
        >
            {label}
        </Badge>
    );
}
