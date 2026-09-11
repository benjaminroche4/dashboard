import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    LeadLinkCard,
    type LinkedLead,
} from '@/components/leads/lead-link-card';
import { notify } from '@/lib/toast';
import { link } from '@/routes/tools/quotes';

/** PATCH tools.quotes.link : rattache (id) ou détache (null) le devis. */
export function linkQuote(
    quoteUuid: string,
    leadId: number | null,
    onDone?: () => void,
) {
    router.patch(
        link({ quote: quoteUuid }).url,
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

/** Lead ou dossier client rattaché au devis. */
export function QuoteLeadLink({
    quoteUuid,
    lead,
    canEdit,
}: {
    quoteUuid: string;
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
                linkQuote(quoteUuid, leadId, done);
                setBusy(false);
            }}
        />
    );
}
