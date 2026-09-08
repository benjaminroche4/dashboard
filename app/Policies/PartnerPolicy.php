<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Toute l'équipe consulte, crée et modifie les partenaires ;
 * seuls les admins les suppriment.
 */
final class PartnerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Partners);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Partners);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Partners);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Partners);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Partners);
    }
}
