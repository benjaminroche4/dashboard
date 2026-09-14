import { Link, router } from '@inertiajs/react';
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
import { convert, edit as leadEdit } from '@/routes/leads';

/**
 * Bouton « Convertir en client » de la fiche lead, avec confirmation :
 * le lead passe en « Converti » et rejoint les dossiers clients.
 */
export function LeadConvertDialog({
    leadUuid,
    leadName,
    status,
    offerLabel = null,
}: {
    leadUuid: string;
    leadName: string;
    status: string;
    /** Formule du lead : sans elle, pas de dossier — le dialogue renvoie la choisir. */
    offerLabel?: string | null;
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
                            {offerLabel
                                ? `Formule ${offerLabel}. Le lead passe en « Converti », quitte le kanban et rejoint les dossiers clients. Factures, devis et documents restent rattachés.`
                                : 'Un dossier client se construit sur une formule : choisissez Accompagné ou Confié sur la fiche du lead, puis revenez ici.'}
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
                        {offerLabel ? (
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
                        ) : (
                            <Button asChild>
                                <Link href={leadEdit({ lead: leadUuid })}>
                                    Choisir la formule
                                </Link>
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
