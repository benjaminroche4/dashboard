<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Toute l'équipe consulte, crée et modifie des listes de pièces ;
 * seuls les admins les suppriment.
 */
final class DocumentRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Documents);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Documents);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Documents);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Documents);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Documents);
    }
}
