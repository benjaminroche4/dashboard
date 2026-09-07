import { router } from '@inertiajs/react';
import { Send } from 'lucide-react';
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
import { send } from '@/routes/invoices';

/**
 * Envoyer une facture au client : confirme le destinataire puis poste sur invoices.send.
 */
export function SendInvoiceDialog({
    invoiceUuid,
    invoiceNumber,
    clientEmail,
    open,
    onOpenChange,
}: {
    invoiceUuid: string;
    invoiceNumber: string;
    clientEmail: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [error, setError] = useState<string | undefined>();
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        setError(undefined);
        setProcessing(true);
        router.post(
            send({ invoice: invoiceUuid }).url,
            {},
            {
                preserveScroll: true,
                onError: (errors) =>
                    setError(
                        errors.status ??
                            errors.client_email ??
                            Object.values(errors)[0] ??
                            "L'envoi a échoué. Réessayez dans un instant.",
                    ),
                onSuccess: () => onOpenChange(false),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Envoyer {invoiceNumber} au client</DialogTitle>
                    <DialogDescription>
                        La facture sera envoyée par e-mail à{' '}
                        <strong>{clientEmail ?? '—'}</strong> avec le PDF en
                        pièce jointe, puis passera au statut « Envoyée ».
                    </DialogDescription>
                </DialogHeader>
                <InputError message={error} />
                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        onClick={submit}
                        disabled={processing}
                        data-test="confirm-send-invoice"
                    >
                        {processing ? <Spinner /> : <Send />}
                        Confirmer l'envoi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
