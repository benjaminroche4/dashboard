<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Toute l'équipe consulte, crée, modifie et convertit les propriétaires ;
 * seuls les admins les suppriment.
 */
final class OwnerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Owners);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Owners);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Owners);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Owners);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Owners);
    }
}
