import { router } from '@inertiajs/react';
import { useState } from 'react';
import { DatePicker } from '@/components/date-picker';
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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { pay } from '@/routes/invoices';

/**
 * Marquer une facture payée : demande la date de paiement puis poste sur invoices.pay.
 */
export function MarkPaidDialog({
    invoiceId,
    invoiceNumber,
    open,
    onOpenChange,
}: {
    invoiceId: number;
    invoiceNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [paidAt, setPaidAt] = useState(() =>
        new Date().toISOString().slice(0, 10),
    );
    const [error, setError] = useState<string | undefined>();
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        if (paidAt === '') {
            setError('Indiquez la date de paiement.');

            return;
        }

        setError(undefined);
        setProcessing(true);
        router.post(
            pay({ invoice: invoiceId }).url,
            { paid_at: paidAt },
            {
                preserveScroll: true,
                onError: (errors) => setError(errors.paid_at ?? errors.status),
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
                        Marquer {invoiceNumber} comme payée
                    </DialogTitle>
                    <DialogDescription>
                        La facture passera au statut « Payée » à la date
                        indiquée.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor={`paid-at-${invoiceId}`}>
                        Date de paiement
                    </Label>
                    <DatePicker
                        id={`paid-at-${invoiceId}`}
                        aria-label="Date de paiement"
                        value={paidAt}
                        onChange={setPaidAt}
                    />
                    <InputError message={error} />
                </div>
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
                    >
                        {processing && <Spinner />}
                        Confirmer le paiement
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
