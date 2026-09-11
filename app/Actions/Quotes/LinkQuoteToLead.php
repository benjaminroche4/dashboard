<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;

/**
 * Rattache un devis à un lead (ou le détache avec null). Un devis n'a qu'un
 * lead, un lead peut avoir plusieurs devis.
 */
final class LinkQuoteToLead
{
    public function handle(Quote $quote, ?Lead $lead, ?User $by = null): Quote
    {
        $previous = $quote->lead;
        $quote->lead()->associate($lead);
        $quote->save();

        if ($lead instanceof Lead) {
            $lead->notes()->create(['body' => "Devis {$quote->number} rattaché à ce lead.", 'user_id' => $by?->id]);
            event(new DashboardUpdated('quotes', ['id' => $quote->id, 'lead_id' => $lead->id], "a rattaché le devis {$quote->number} au lead {$lead->fullName()}"));
        } elseif ($previous instanceof Lead) {
            $previous->notes()->create(['body' => "Devis {$quote->number} détaché de ce lead.", 'user_id' => $by?->id]);
            event(new DashboardUpdated('quotes', ['id' => $quote->id, 'lead_id' => null], "a détaché le devis {$quote->number} du lead {$previous->fullName()}"));
        }

        return $quote;
    }
}
