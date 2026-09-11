import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    LeadLinkCard,
    type LinkedLead,
} from '@/components/leads/lead-link-card';
import { notify } from '@/lib/toast';
import { link } from '@/routes/invoices';

/** PATCH invoices.link : rattache (id) ou détache (null) la facture. */
export function linkInvoice(
    invoiceUuid: string,
    leadId: number | null,
    onDone?: () => void,
) {
    router.patch(
        link({ invoice: invoiceUuid }).url,
        { lead_id: leadId },
        {
            preserveScroll: true,
            onSuccess: onDone,
            onError: (errors) =>
                notify.error(
                    'Rattachement impossible',
                    Object.values(errors)[0] ?? 'Réessayez.',
                ),
        },
    );
}

/** Lead ou dossier client rattaché à la facture. */
export function InvoiceLeadLink({
    invoiceUuid,
    lead,
    canEdit,
}: {
    invoiceUuid: string;
    lead: LinkedLead | null;
    canEdit: boolean;
}) {
    const [busy, setBusy] = useState(false);

    return (
        <LeadLinkCard
            lead={lead}
            canEdit={canEdit}
            busy={busy}
            onLink={(leadId, done) => {
                setBusy(true);
                linkInvoice(invoiceUuid, leadId, done);
                setBusy(false);
            }}
        />
    );
}
