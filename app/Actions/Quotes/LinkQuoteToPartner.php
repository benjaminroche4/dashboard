<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\Quote;
use App\Models\User;

/**
 * Rattache un devis à un partenaire (ou le détache avec null). Un devis est
 * adressé soit à un lead, soit à un partenaire : rattacher l'un détache
 * l'autre, sinon le document aurait deux destinataires.
 */
final class LinkQuoteToPartner
{
    public function handle(Quote $quote, ?Partner $partner, ?User $by = null): Quote
    {
        $previous = $quote->partner;
        $quote->partner()->associate($partner);

        if ($partner instanceof Partner) {
            $quote->lead()->disassociate();
        }

        $quote->save();

        if ($partner instanceof Partner) {
            event(new DashboardUpdated('quotes', ['id' => $quote->id, 'partner_id' => $partner->id], "a rattaché le devis {$quote->number} au partenaire {$partner->name}", $by));
        } elseif ($previous instanceof Partner) {
            event(new DashboardUpdated('quotes', ['id' => $quote->id, 'partner_id' => null], "a détaché le devis {$quote->number} du partenaire {$previous->name}", $by));
        }

        return $quote;
    }
}
