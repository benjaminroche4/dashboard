<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Marque le devis accepté par le client.
 */
final class AcceptQuote
{
    /**
     * @throws ValidationException si le statut ne le permet pas
     */
    public function handle(Quote $quote, ?User $by = null): Quote
    {
        if (! $quote->status->canTransitionTo(QuoteStatus::Accepted)) {
            throw ValidationException::withMessages(['status' => __('Ce devis ne peut pas être accepté depuis le statut « :status ».', ['status' => $quote->status->label()])]);
        }

        $quote->accepted_at = now();
        $quote->transitionTo(QuoteStatus::Accepted, $by, 'Accepté par le client');

        $quote->lead?->notes()->create(['body' => "Devis {$quote->number} accepté.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('quotes', ['id' => $quote->id, 'lead_id' => $quote->lead_id], "a marqué le devis {$quote->number} accepté"));

        return $quote;
    }
}
