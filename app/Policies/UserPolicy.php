<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

/**
 * Gestion des membres du staff : réservée aux administrateurs,
 * sauf la lecture et la modification de son propre profil.
 */
final class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, User $target): bool
    {
        return $user->isAdmin() || $user->is($target);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, User $target): bool
    {
        return $user->isAdmin() || $user->is($target);
    }

    public function updateRole(User $user, User $target): bool
    {
        return $user->isAdmin() && ! $user->is($target);
    }

    public function delete(User $user, User $target): bool
    {
        return $user->isAdmin() && ! $user->is($target);
    }
}
