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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { decline } from '@/routes/tools/quotes';

/**
 * Marquer un devis refusé : motif facultatif, puis poste sur tools.quotes.decline.
 */
export function DeclineQuoteDialog({
    quoteUuid,
    quoteNumber,
    open,
    onOpenChange,
}: {
    quoteUuid: string;
    quoteNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        setError(undefined);
        setProcessing(true);
        router.post(
            decline({ quote: quoteUuid }).url,
            { reason: reason.trim() || null },
            {
                preserveScroll: true,
                onError: (errors) => setError(errors.reason ?? errors.status),
                onSuccess: () => {
                    setReason('');
                    onOpenChange(false);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Marquer {quoteNumber} refusé</DialogTitle>
                    <DialogDescription>
                        Le devis passera au statut « Refusé ». Le motif est
                        ajouté à l'historique et aux notes du lead.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="decline-reason">Motif (facultatif)</Label>
                    <Textarea
                        id="decline-reason"
                        rows={3}
                        maxLength={255}
                        placeholder="Ex. A choisi une autre agence"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                    <InputError message={error} />
                </div>
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
                        variant="destructive"
                        onClick={submit}
                        disabled={processing}
                        data-test="confirm-decline-quote"
                    >
                        {processing && <Spinner />}
                        Confirmer le refus
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
