<?php

declare(strict_types=1);

namespace App\Actions\Directory;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\Favorite;
use App\Models\Partner;
use App\Models\User;

/**
 * Pose ou retire l'étoile d'un membre sur un agent, une agence ou un partenaire.
 *
 * Favori strictement personnel : aucun autre membre ne voit changer quoi
 * que ce soit, il n'y a donc pas de `DashboardUpdated`.
 */
final class ToggleFavorite
{
    /**
     * @return bool `true` si le sujet est désormais en favori.
     */
    public function handle(User $user, Agent|Agency|Partner $subject): bool
    {
        $existing = $subject->favorites()->where('user_id', $user->id)->first();

        if ($existing instanceof Favorite) {
            $existing->delete();

            return false;
        }

        $subject->favorites()->create(['user_id' => $user->id]);

        return true;
    }
}
