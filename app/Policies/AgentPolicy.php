<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Toute l'équipe consulte, crée et modifie les agents immobiliers ;
 * seuls les admins les suppriment.
 */
final class AgentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Agents);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Agents);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Agents);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Agents);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Agents);
    }
}
