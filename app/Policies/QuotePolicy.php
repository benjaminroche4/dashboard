<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\StaffRole;
use App\Models\User;

/**
 * Tout le staff consulte les devis ; admins et managers les créent et les font avancer.
 */
final class QuotePolicy
{
    public function viewAny(): bool
    {
        return true;
    }

    public function view(): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasRoleAtLeast(StaffRole::Manager);
    }

    public function update(User $user): bool
    {
        return $user->hasRoleAtLeast(StaffRole::Manager);
    }

    public function delete(User $user): bool
    {
        return $user->isAdmin();
    }
}
