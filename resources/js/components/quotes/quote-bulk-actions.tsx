import { router } from '@inertiajs/react';
import { Check, Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { bulkAccept, bulkSend } from '@/routes/tools/quotes';
import type { Quote } from '@/types';

/**
 * Actions groupées du tableau des devis : envoyer les envoyables, marquer
 * acceptés ceux qui peuvent l'être. Les autres devis cochés sont ignorés côté
 * serveur et listés dans le toast.
 */
export function QuoteBulkActions({
    quotes,
    onDone,
}: {
    /** Devis cochés dans le tableau. */
    quotes: Quote[];
    /** Vide la sélection une fois l'action réussie. */
    onDone: () => void;
}) {
    const [sending, setSending] = useState(false);
    const [accepting, setAccepting] = useState(false);

    const sendable = quotes.filter((quote) => quote.can_send);
    const acceptable = quotes.filter((quote) => quote.can_accept);

    const run = (
        url: string,
        rows: Quote[],
        setBusy: (busy: boolean) => void,
    ) => {
        setBusy(true);
        router.post(
            url,
            { ids: rows.map((quote) => quote.id) },
            {
                preserveScroll: true,
                onSuccess: onDone,
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sendable.length === 0 || sending}
                onClick={() => run(bulkSend().url, sendable, setSending)}
            >
                {sending ? <Spinner /> : <Send aria-hidden />}
                Envoyer ({sendable.length})
            </Button>
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={acceptable.length === 0 || accepting}
                onClick={() => run(bulkAccept().url, acceptable, setAccepting)}
            >
                {accepting ? <Spinner /> : <Check aria-hidden />}
                Marquer acceptés ({acceptable.length})
            </Button>
        </>
    );
}
