import { router } from '@inertiajs/react';
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
import { quote } from '@/routes/invoices';

/**
 * Transformer une facture en devis : confirmation (la facture est annulée,
 * un numéro émis ne se supprime pas) puis POST sur invoices.quote.
 */
export function InvoiceToQuoteDialog({
    invoiceUuid,
    invoiceNumber,
    open,
    onOpenChange,
}: {
    invoiceUuid: string;
    invoiceNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [error, setError] = useState<string | undefined>();
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        setError(undefined);
        setProcessing(true);
        router.post(
            quote({ invoice: invoiceUuid }).url,
            {},
            {
                onError: (errors) => setError(errors.status),
                onSuccess: () => onOpenChange(false),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        Transformer {invoiceNumber} en devis
                    </DialogTitle>
                    <DialogDescription>
                        Un devis brouillon reprend le client, les lignes, la TVA
                        et la remise. La facture passe en « Annulée » et garde
                        le lien vers ce devis.
                    </DialogDescription>
                </DialogHeader>
                <InputError message={error} />
                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        onClick={submit}
                        disabled={processing}
                        data-test="confirm-invoice-to-quote"
                    >
                        {processing && <Spinner />}
                        Créer le devis
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
