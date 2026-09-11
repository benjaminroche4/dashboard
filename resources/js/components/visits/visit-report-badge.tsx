import { ClipboardCheck, ClipboardPen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Visit } from '@/types';

/**
 * État du compte rendu d'une visite : « À rédiger » en rouge quand la visite
 * est passée sans compte rendu, « Compte rendu » en vert une fois rédigé,
 * rien avant la visite.
 */
export function VisitReportBadge({ visit }: { visit: Visit }) {
    if (visit.report) {
        return (
            <Badge
                variant="secondary"
                data-report="done"
                className="bg-green-50 font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
                title={
                    visit.report_author
                        ? `Rédigé par ${visit.report_author}`
                        : undefined
                }
            >
                <ClipboardCheck className="size-3" aria-hidden />
                Compte rendu
            </Badge>
        );
    }

    if (visit.report_due) {
        return (
            <Badge
                variant="secondary"
                data-report="due"
                className="bg-orange-50 font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300"
            >
                <ClipboardPen className="size-3" aria-hidden />
                Compte rendu à rédiger
            </Badge>
        );
    }

    return null;
}
