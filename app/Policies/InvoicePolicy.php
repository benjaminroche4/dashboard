<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\StaffRole;
use App\Models\User;

/**
 * Tout le staff consulte les factures ; admins et managers les gèrent.
 */
final class InvoicePolicy
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
