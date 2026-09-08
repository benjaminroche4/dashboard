<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Toute l'équipe consulte, ajoute et modifie les visites ; seuls les admins les suppriment.
 */
final class VisitPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Visits);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Visits);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Visits);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Visits);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Visits);
    }
}
