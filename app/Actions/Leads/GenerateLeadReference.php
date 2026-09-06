<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Models\Lead;
use Illuminate\Support\Facades\DB;

/**
 * Référence publique d'un lead, au format « LD-XXXX » (quatre chiffres tirés
 * au hasard, unique). Quand les 10 000 combinaisons se raréfient, on passe à
 * cinq chiffres.
 */
final class GenerateLeadReference
{
    public const string PREFIX = 'LD-';

    public function handle(): string
    {
        foreach ([4, 4, 4, 4, 4, 5, 5, 6] as $digits) {
            $candidate = self::PREFIX.str_pad((string) random_int(0, (10 ** $digits) - 1), $digits, '0', STR_PAD_LEFT);

            if (! $this->taken($candidate)) {
                return $candidate;
            }
        }

        // Dernier recours : identifiant temporel, toujours unique.
        return self::PREFIX.hrtime(true);
    }

    private function taken(string $reference): bool
    {
        return DB::table((new Lead)->getTable())->where('reference', $reference)->exists();
    }
}
