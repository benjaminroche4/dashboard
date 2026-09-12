import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    LeadLinkCard,
    type LinkedLead,
} from '@/components/leads/lead-link-card';
import { notify } from '@/lib/toast';
import { link } from '@/routes/invoices';
import type { LinkedPartner } from '@/types';

/** PATCH invoices.link : rattache (id) ou détache (null) la facture. */
export function linkInvoice(
    invoiceUuid: string,
    payload: { lead_id: number | null } | { partner_id: number | null },
    onDone?: () => void,
) {
    router.patch(link({ invoice: invoiceUuid }).url, payload, {
        preserveScroll: true,
        onSuccess: onDone,
        onError: (errors) =>
            notify.error(
                'Rattachement impossible',
                Object.values(errors)[0] ?? 'Réessayez.',
            ),
    });
}

/** Lead, dossier client ou partenaire rattaché à la facture. */
export function InvoiceLeadLink({
    invoiceUuid,
    lead,
    partner,
    canEdit,
}: {
    invoiceUuid: string;
    lead: LinkedLead | null;
    partner: LinkedPartner | null;
    canEdit: boolean;
}) {
    const [busy, setBusy] = useState(false);
    const send = (
        payload: { lead_id: number | null } | { partner_id: number | null },
        done: () => void,
    ) => {
        setBusy(true);
        linkInvoice(invoiceUuid, payload, done);
        setBusy(false);
    };

    return (
        <LeadLinkCard
            lead={lead}
            partner={partner}
            canEdit={canEdit}
            busy={busy}
            onLink={(leadId, done) => send({ lead_id: leadId }, done)}
            onLinkPartner={(partnerId, done) =>
                send({ partner_id: partnerId }, done)
            }
        />
    );
}
