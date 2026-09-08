import { router } from '@inertiajs/react';
import { ClipboardCheck, ClipboardPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { notify } from '@/lib/toast';
import { report as visioReport } from '@/routes/leads/visio';
import type { LeadDetail } from '@/types';

const MIN_LENGTH = 10;

/** Le lien « Rédiger le compte rendu » de l'e-mail de rappel ouvre la fiche avec `?report=visio`. */
function reportRequested(): boolean {
    try {
        return (
            new URLSearchParams(window.location.search).get('report') ===
            'visio'
        );
    } catch {
        return false;
    }
}

/**
 * Compte rendu de l'appel vidéo : badge d'état (« À rédiger » en rouge après
 * la visio, « Compte rendu rédigé » en vert), bouton qui ouvre un dialogue
 * avec un texte libre, recopié dans la fiche du lead à l'enregistrement.
 */
export function LeadVisioReportDialog({ lead }: { lead: LeadDetail }) {
    const [open, setOpen] = useState(() => reportRequested());
    const [report, setReport] = useState(lead.visio_report ?? '');
    const [error, setError] = useState<string | undefined>();
    const [busy, setBusy] = useState(false);
    const written = lead.visio_report !== null && !lead.visio_report_due;

    // Chaque ouverture repart du compte rendu existant.
    useEffect(() => {
        if (open) {
            setReport(lead.visio_report ?? '');
            setError(undefined);
        }
    }, [open, lead.visio_report]);

    if (lead.visio_at === null) {
        return null;
    }

    const submit = () => {
        if (report.trim().length < MIN_LENGTH) {
            setError(`Décrivez l’appel en au moins ${MIN_LENGTH} caractères.`);

            return;
        }

        setBusy(true);
        router.post(
            visioReport({ lead: lead.uuid }).url,
            { report: report.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOpen(false);
                    notify.success('Compte rendu enregistré');
                },
                onError: (errors) => setError(errors.report),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {written ? (
                    <Badge
                        variant="secondary"
                        data-visio-report="done"
                        className="bg-green-50 font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
                    >
                        <ClipboardCheck className="size-3" aria-hidden />
                        Compte rendu rédigé
                    </Badge>
                ) : lead.visio_report_due ? (
                    <Badge
                        variant="secondary"
                        data-visio-report="due"
                        className="bg-red-50 font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                    >
                        <ClipboardPen className="size-3" aria-hidden />
                        Compte rendu à rédiger
                    </Badge>
                ) : null}
                {(lead.visio_report_due || written) && (
                    <Button
                        type="button"
                        variant={lead.visio_report_due ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setOpen(true)}
                    >
                        {written
                            ? 'Modifier le compte rendu'
                            : 'Rédiger le compte rendu'}
                    </Button>
                )}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogTitle>
                        Compte rendu de l’appel vidéo avec {lead.name}
                    </DialogTitle>
                    <DialogDescription>
                        Vos impressions seront recopiées dans la fiche du lead
                        et comptent comme un contact.
                    </DialogDescription>
                    <div className="grid gap-1.5">
                        <Label htmlFor="visio-report">Compte rendu</Label>
                        <Textarea
                            id="visio-report"
                            rows={6}
                            maxLength={5000}
                            autoFocus
                            placeholder="Ressenti du lead, budget et calendrier confirmés, objections, suite à donner…"
                            className="bg-background"
                            value={report}
                            aria-invalid={Boolean(error)}
                            onChange={(event) => setReport(event.target.value)}
                        />
                        <InputError message={error} />
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button disabled={busy} onClick={submit}>
                            {busy && <Spinner />}
                            {written
                                ? 'Mettre à jour le compte rendu'
                                : 'Enregistrer le compte rendu'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
