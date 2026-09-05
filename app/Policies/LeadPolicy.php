<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

/**
 * Tout le staff consulte, crée et fait avancer les leads ; seuls les admins suppriment.
 */
final class LeadPolicy
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
