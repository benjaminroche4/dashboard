<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Marque le devis refusé par le client, avec un motif facultatif.
 */
final class DeclineQuote
{
    /**
     * @throws ValidationException si le statut ne le permet pas
     */
    public function handle(Quote $quote, ?string $reason = null, ?User $by = null): Quote
    {
        if (! $quote->status->canTransitionTo(QuoteStatus::Declined)) {
            throw ValidationException::withMessages(['status' => __('Ce devis ne peut pas être refusé depuis le statut « :status ».', ['status' => $quote->status->label()])]);
        }

        $reason = $reason === null || trim($reason) === '' ? null : trim($reason);

        $quote->declined_at = now();
        $quote->transitionTo(QuoteStatus::Declined, $by, $reason ?? 'Refusé par le client');

        $quote->lead?->notes()->create([
            'body' => "Devis {$quote->number} refusé.".($reason === null ? '' : " Motif : {$reason}"),
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated('quotes', ['id' => $quote->id, 'lead_id' => $quote->lead_id], "a marqué le devis {$quote->number} refusé"));

        return $quote;
    }
}
