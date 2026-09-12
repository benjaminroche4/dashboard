import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    LeadLinkCard,
    type LinkedLead,
} from '@/components/leads/lead-link-card';
import { notify } from '@/lib/toast';
import { link } from '@/routes/tools/quotes';
import type { LinkedPartner } from '@/types';

/** PATCH tools.quotes.link : rattache (id) ou détache (null) le devis. */
export function linkQuote(
    quoteUuid: string,
    payload: { lead_id: number | null } | { partner_id: number | null },
    onDone?: () => void,
) {
    router.patch(link({ quote: quoteUuid }).url, payload, {
        preserveScroll: true,
        onSuccess: onDone,
        onError: (errors) =>
            notify.error(
                'Rattachement impossible',
                Object.values(errors)[0] ?? 'Réessayez.',
            ),
    });
}

/** Lead, dossier client ou partenaire rattaché au devis. */
export function QuoteLeadLink({
    quoteUuid,
    lead,
    partner,
    canEdit,
}: {
    quoteUuid: string;
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
        linkQuote(quoteUuid, payload, done);
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
