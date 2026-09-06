<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\LeadNote;
use App\Models\User;

/**
 * Une note se corrige ou se retire par son auteur pendant un court délai ;
 * les admins peuvent toujours retirer une note.
 */
final class LeadNotePolicy
{
    /** Délai, en minutes, pendant lequel l'auteur peut encore retoucher sa note. */
    public const int EDIT_WINDOW_MINUTES = 15;

    public function update(User $user, LeadNote $note): bool
    {
        return $this->ownsRecently($user, $note);
    }

    public function delete(User $user, LeadNote $note): bool
    {
        return $user->isAdmin() || $this->ownsRecently($user, $note);
    }

    private function ownsRecently(User $user, LeadNote $note): bool
    {
        return $note->user_id === $user->id
            && $note->created_at !== null
            && $note->created_at->greaterThan(now()->subMinutes(self::EDIT_WINDOW_MINUTES));
    }
}
