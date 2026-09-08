import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
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
import { report as visitReport } from '@/routes/clients/visits';
import type { Visit } from '@/types';

const MIN_LENGTH = 10;

/**
 * Compte rendu post-visite : un texte libre, recopié dans le dossier du
 * client à l'enregistrement. Une visite planifiée passe alors en « Effectuée ».
 */
export function VisitReportDialog({
    visit,
    open,
    onOpenChange,
}: {
    visit: Visit;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [report, setReport] = useState(visit.report ?? '');
    const [error, setError] = useState<string | undefined>();
    const [busy, setBusy] = useState(false);

    // Chaque ouverture repart du compte rendu existant.
    useEffect(() => {
        if (open) {
            setReport(visit.report ?? '');
            setError(undefined);
        }
    }, [open, visit.report]);

    const submit = () => {
        if (report.trim().length < MIN_LENGTH) {
            setError(
                `Décrivez la visite en au moins ${MIN_LENGTH} caractères.`,
            );

            return;
        }

        setBusy(true);
        router.post(
            visitReport({ visit: visit.uuid }).url,
            { report: report.trim() },
            {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onError: (errors) => setError(errors.report),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogTitle>
                    Compte rendu de la visite de {visit.client.name}
                </DialogTitle>
                <DialogDescription>
                    {visit.property.label} · vos impressions seront recopiées
                    dans le dossier du client.
                </DialogDescription>
                <div className="grid gap-1.5">
                    <Label htmlFor={`visit-report-${visit.uuid}`}>
                        Compte rendu
                    </Label>
                    <Textarea
                        id={`visit-report-${visit.uuid}`}
                        rows={6}
                        maxLength={5000}
                        autoFocus
                        placeholder="Réaction du client, points forts et réserves sur le bien, suite à donner…"
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
                        {visit.report
                            ? 'Mettre à jour le compte rendu'
                            : 'Enregistrer le compte rendu'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
