<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Toute l'équipe consulte, crée et modifie les entreprises ;
 * seuls ceux qui gèrent la section les suppriment.
 */
final class CompanyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Companies);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Companies);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Companies);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Companies);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Companies);
    }
}
