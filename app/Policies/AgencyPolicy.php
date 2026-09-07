<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

/**
 * Toute l'équipe consulte, crée et modifie les agences immobiliers ;
 * seuls les admins les suppriment.
 */
final class AgencyPolicy
{
    public function viewAny(): bool
    {
        return true;
    }

    public function view(): bool
    {
        return true;
    }

    public function create(): bool
    {
        return true;
    }

    public function update(): bool
    {
        return true;
    }

    public function delete(User $user): bool
    {
        return $user->isAdmin();
    }
}
