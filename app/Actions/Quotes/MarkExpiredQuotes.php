<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Models\Quote;

/**
 * Passe en « expiré » les devis envoyés dont la validité est dépassée.
 */
final class MarkExpiredQuotes
{
    /**
     * @return int Nombre de devis expirés
     */
    public function handle(): int
    {
        $count = 0;

        Quote::query()
            ->where('status', QuoteStatus::Sent)
            ->whereDate('valid_until', '<', today())
            ->orderBy('id')
            ->each(function (Quote $quote) use (&$count): void {
                $quote->transitionTo(QuoteStatus::Expired, null, 'Validité dépassée');
                $count++;
            });

        if ($count > 0) {
            event(new DashboardUpdated('quotes', ['count' => $count], "a détecté {$count} devis expiré(s)"));
        }

        return $count;
    }
}
