<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

/**
 * Le catalogue des pièces est géré par les admins seulement : le reste de
 * l'équipe le consomme via le formulaire de liste.
 */
final class CatalogDocumentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user): bool
    {
        return $user->isAdmin();
    }
}
