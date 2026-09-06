import { router } from '@inertiajs/react';
import { Check, Send } from 'lucide-react';
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
import { bulkPay, bulkSend } from '@/routes/invoices';
import type { Invoice } from '@/types';

type Props = {
    /** Factures cochées dans le tableau. */
    invoices: Invoice[];
    /** Vide la sélection une fois l'action réussie. */
    onDone: () => void;
};

/**
 * Actions groupées du tableau des factures : envoyer les envoyables,
 * marquer payées les payables. Les autres factures cochées sont ignorées
 * côté serveur et listées dans le toast.
 */
export function InvoiceBulkActions({ invoices, onDone }: Props) {
    const [sending, setSending] = useState(false);
    const [paying, setPaying] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const [paidAt, setPaidAt] = useState(() =>
        new Date().toISOString().slice(0, 10),
    );
    const [payError, setPayError] = useState<string | undefined>();

    const sendable = invoices.filter((invoice) => invoice.can_send);
    const payable = invoices.filter((invoice) => invoice.can_pay);

    const send = () => {
        setSending(true);
        router.post(
            bulkSend().url,
            { ids: sendable.map((invoice) => invoice.id) },
            {
                preserveScroll: true,
                onSuccess: onDone,
                onFinish: () => setSending(false),
            },
        );
    };

    const pay = () => {
        if (paidAt === '') {
            setPayError('Indiquez la date de paiement.');

            return;
        }

        setPayError(undefined);
        setPaying(true);
        router.post(
            bulkPay().url,
            { ids: payable.map((invoice) => invoice.id), paid_at: paidAt },
            {
                preserveScroll: true,
                onError: (errors) => setPayError(errors.paid_at ?? errors.ids),
                onSuccess: () => {
                    setPayOpen(false);
                    onDone();
                },
                onFinish: () => setPaying(false),
            },
        );
    };

    return (
        <div
            role="group"
            aria-label="Actions groupées"
            className="flex flex-wrap items-center gap-2"
        >
            <Button
                size="sm"
                variant="outline"
                onClick={send}
                disabled={sendable.length === 0 || sending}
                title={
                    sendable.length === 0
                        ? 'Aucune facture cochée n’est envoyable.'
                        : undefined
                }
            >
                {sending ? <Spinner /> : <Send />}
                Envoyer ({sendable.length})
            </Button>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setPayOpen(true)}
                disabled={payable.length === 0 || paying}
                title={
                    payable.length === 0
                        ? 'Aucune facture cochée n’est payable.'
                        : undefined
                }
            >
                <Check />
                Marquer payées ({payable.length})
            </Button>

            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            Marquer {payable.length} facture(s) comme payée(s)
                        </DialogTitle>
                        <DialogDescription>
                            Les factures passeront au statut « Payée » à la même
                            date.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="bulk-paid-at">Date de paiement</Label>
                        <DatePicker
                            id="bulk-paid-at"
                            aria-label="Date de paiement"
                            value={paidAt}
                            onChange={setPaidAt}
                        />
                        <InputError message={payError} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setPayOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="button" onClick={pay} disabled={paying}>
                            {paying && <Spinner />}
                            Confirmer le paiement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
