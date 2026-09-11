<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Enums\QuoteStatus;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Envoie plusieurs devis d'un coup : ceux qui ne sont pas envoyables (statut ou
 * e-mail manquant) sont ignorés et listés, jamais bloquants.
 */
final readonly class SendQuotes
{
    public function __construct(private SendQuote $sendQuote) {}

    /**
     * @param  Collection<int, Quote>  $quotes
     * @return array{sent: list<string>, skipped: list<string>}
     */
    public function handle(Collection $quotes, ?User $by = null): array
    {
        $sent = [];
        $skipped = [];

        foreach ($quotes as $quote) {
            $sendable = $quote->status->canTransitionTo(QuoteStatus::Sent)
                && $quote->client_email !== null
                && $quote->client_email !== '';

            if (! $sendable) {
                $skipped[] = $quote->number;

                continue;
            }

            $this->sendQuote->handle($quote, $by);
            $sent[] = $quote->number;
        }

        return ['sent' => $sent, 'skipped' => $skipped];
    }
}
