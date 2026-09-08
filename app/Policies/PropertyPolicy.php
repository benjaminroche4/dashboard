<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Toute l'équipe consulte, ajoute et modifie les biens ; seuls les admins les suppriment.
 */
final class PropertyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Properties);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Properties);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Properties);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Properties);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Properties);
    }
}
