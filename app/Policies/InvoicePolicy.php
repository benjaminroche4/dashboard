<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Tout le staff consulte les factures ; admins et managers les gèrent.
 */
final class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Invoices);
    }

    public function view(User $user): bool
    {
        return $user->canRead(SiteSection::Invoices);
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::Invoices);
    }

    public function update(User $user): bool
    {
        return $user->canWrite(SiteSection::Invoices);
    }

    public function delete(User $user): bool
    {
        return $user->canManage(SiteSection::Invoices);
    }
}
