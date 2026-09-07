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
import { send } from '@/routes/tools/quotes';

/**
 * Envoyer un devis au client : confirme le destinataire puis poste sur tools.quotes.send.
 */
export function SendQuoteDialog({
    quoteUuid,
    quoteNumber,
    clientEmail,
    open,
    onOpenChange,
}: {
    quoteUuid: string;
    quoteNumber: string;
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
            send({ quote: quoteUuid }).url,
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
                    <DialogTitle>Envoyer {quoteNumber} au client</DialogTitle>
                    <DialogDescription>
                        Le devis sera envoyé par e-mail à{' '}
                        <strong>{clientEmail ?? '—'}</strong> avec le PDF en
                        pièce jointe, puis passera au statut « Envoyé ».
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
                        data-test="confirm-send-quote"
                    >
                        {processing ? <Spinner /> : <Send />}
                        Confirmer l'envoi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
