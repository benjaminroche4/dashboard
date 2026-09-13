import { ClipboardPen } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VisitReportDialog } from '@/components/visits/visit-report-dialog';
import type { Visit } from '@/types';

/**
 * Raccourci « Rédiger » d'une visite dont le compte rendu manque : il ouvre
 * la modale du compte rendu sans passer par le menu « ⋯ ». Rien à afficher
 * quand le compte rendu est déjà écrit ou que la visite n'est pas passée.
 */
export function WriteReportButton({ visit }: { visit: Visit }) {
    const [open, setOpen] = useState(false);

    if (!visit.report_due) {
        return null;
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 dark:border-orange-900 dark:text-orange-300 dark:hover:bg-orange-950/50"
                aria-label={`Rédiger le compte rendu de la visite de ${visit.client.name}`}
                onClick={() => setOpen(true)}
            >
                <ClipboardPen aria-hidden />
                Rédiger
            </Button>
            <VisitReportDialog
                visit={visit}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    );
}
