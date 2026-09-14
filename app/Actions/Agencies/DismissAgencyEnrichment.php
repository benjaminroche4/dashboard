<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Models\Agency;

/** Écarte la proposition de profil de l'assistant sans rien écrire. */
final class DismissAgencyEnrichment
{
    public function handle(Agency $agency): void
    {
        $agency->forceFill(['ai_profile' => null, 'ai_profile_at' => null])->save();
    }
}
