<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\LeadSegment;
use App\Enums\LeadStatus;
use App\Enums\SiteSection;
use App\Models\Lead;
use App\Models\User;

/**
 * Droits sur un lead selon la section dont il relève : un dossier client
 * (lead converti) dépend de « Clients », un lead propriétaire de « Leads
 * propriétaires », les autres de « Leads ». Un membre qui n'a accès qu'aux
 * dossiers clients ne modifie donc jamais un lead en cours.
 */
final class LeadPolicy
{
    /** Section dont relève un lead. */
    public static function section(Lead $lead): SiteSection
    {
        if ($lead->status === LeadStatus::Converted) {
            return SiteSection::Clients;
        }

        return LeadSegment::fromLead($lead) === LeadSegment::Owner ? SiteSection::OwnerLeads : SiteSection::Leads;
    }

    /** Un lead se consulte depuis les leads locataires, les leads propriétaires ou les dossiers clients. */
    public function viewAny(User $user): bool
    {
        return $user->canRead(SiteSection::Leads, SiteSection::OwnerLeads, SiteSection::Clients);
    }

    public function view(User $user, Lead $lead): bool
    {
        return $user->canRead(self::section($lead));
    }

    public function create(User $user): bool
    {
        return $user->canWrite(SiteSection::LeadsCreate, SiteSection::OwnerLeadsCreate);
    }

    public function update(User $user, Lead $lead): bool
    {
        return $user->canWrite(self::section($lead));
    }

    public function delete(User $user, Lead $lead): bool
    {
        return $user->canManage(self::section($lead));
    }
}
