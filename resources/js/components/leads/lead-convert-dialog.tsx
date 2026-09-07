import { router } from '@inertiajs/react';
import { UserRoundCheck } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { convert } from '@/routes/leads';

/**
 * Bouton « Convertir en client » de la fiche lead, avec confirmation :
 * le lead passe en « Converti » et rejoint les dossiers clients.
 */
export function LeadConvertDialog({
    leadUuid,
    leadName,
    status,
}: {
    leadUuid: string;
    leadName: string;
    status: string;
}) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>();

    if (status === 'converted' || status === 'archived') {
        return null;
    }

    const submit = () => {
        setBusy(true);
        setError(undefined);
        router.post(
            convert({ lead: leadUuid }).url,
            {},
            {
                onError: (errors) =>
                    setError(errors.status ?? Object.values(errors)[0]),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <>
            <Button onClick={() => setOpen(true)} data-test="convert-lead">
                <UserRoundCheck aria-hidden />
                Convertir en client
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            Convertir {leadName} en client ?
                        </DialogTitle>
                        <DialogDescription>
                            Le lead passe en « Converti », quitte le kanban et
                            rejoint les dossiers clients. Factures, devis et
                            documents restent rattachés.
                        </DialogDescription>
                    </DialogHeader>
                    <InputError message={error} />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={busy}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={submit}
                            disabled={busy}
                            data-test="confirm-convert-lead"
                        >
                            {busy ? (
                                <Spinner />
                            ) : (
                                <UserRoundCheck aria-hidden />
                            )}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
