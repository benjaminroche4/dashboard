<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Enums\QuoteStatus;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Marque plusieurs devis acceptés d'un coup : ceux qui ne peuvent pas l'être
 * depuis leur statut sont ignorés et listés.
 */
final readonly class AcceptQuotes
{
    public function __construct(private AcceptQuote $acceptQuote) {}

    /**
     * @param  Collection<int, Quote>  $quotes
     * @return array{accepted: list<string>, skipped: list<string>}
     */
    public function handle(Collection $quotes, ?User $by = null): array
    {
        $accepted = [];
        $skipped = [];

        foreach ($quotes as $quote) {
            if (! $quote->status->canTransitionTo(QuoteStatus::Accepted)) {
                $skipped[] = $quote->number;

                continue;
            }

            $this->acceptQuote->handle($quote, $by);
            $accepted[] = $quote->number;
        }

        return ['accepted' => $accepted, 'skipped' => $skipped];
    }
}
