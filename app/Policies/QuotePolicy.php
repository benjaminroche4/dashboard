<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Tout le staff consulte les devis ; admins et managers les créent et les font avancer.
 */
final class QuotePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Quotes);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Quotes);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Quotes);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Quotes);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Quotes);
    }
}
