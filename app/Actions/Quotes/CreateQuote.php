<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Data\QuoteData;
use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Crée un devis en brouillon : numéro séquentiel, totaux calculés,
 * première entrée d'historique, puis diffusion temps réel.
 */
final class CreateQuote
{
    public function handle(QuoteData $data, ?User $creator = null): Quote
    {
        $quote = DB::transaction(function () use ($data, $creator): Quote {
            $quote = Quote::create([
                ...$data->toArray(),
                'number' => self::nextNumber(),
                'status' => QuoteStatus::Draft,
                'created_by' => $creator?->id,
            ]);

            $quote->statusChanges()->create([
                'from_status' => null,
                'to_status' => $quote->status,
                'changed_by' => $creator?->id,
                'note' => 'Création',
                'created_at' => now(),
            ]);

            return $quote;
        });

        // `partner_id` rattache l'entrée au journal de la fiche partenaire.
        event(new DashboardUpdated('quotes', ['id' => $quote->id, 'partner_id' => $quote->partner_id], "a créé le devis {$quote->number}"));

        return $quote;
    }

    /**
     * Prochain numéro : préfixe (DV-27) + séquence sur 3 chiffres minimum, ex. DV-27054.
     */
    public static function nextNumber(): string
    {
        $prefix = (string) config('company.quote_prefix', 'DV-27');

        // Tri par longueur puis valeur : « RP-271000 » passe bien après « RP-27999 »
        // (un tri alphabétique seul renverrait « 999 » pour toujours). Verrou de ligne
        // le temps de la transaction pour deux créations simultanées.
        $last = Quote::query()
            ->where('number', 'like', $prefix.'%')
            ->orderByRaw('LENGTH(number) DESC, number DESC')
            ->lockForUpdate()
            ->value('number');

        $sequence = $last === null ? 0 : (int) substr((string) $last, strlen($prefix));

        return sprintf('%s%03d', $prefix, $sequence + 1);
    }
}
