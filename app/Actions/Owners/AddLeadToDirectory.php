<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Enums\OwnerKind;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\User;

/**
 * Fait entrer un lead propriétaire dans l'annuaire : la prospection reste le
 * lead, l'annuaire garde qui possède quoi, et le lien entre les deux évite de
 * ressaisir la fiche à la main puis de reprospecter quelqu'un qu'on suit déjà.
 * Sans effet si le lead a déjà sa fiche.
 */
final class AddLeadToDirectory
{
    public function handle(Lead $lead, ?User $by = null): Owner
    {
        $existing = $lead->owner()->first();

        if ($existing !== null) {
            return $existing;
        }

        $company = trim((string) $lead->company);

        $owner = Owner::query()->create([
            'kind' => $company === '' ? OwnerKind::Individual : OwnerKind::Company,
            'first_name' => $lead->first_name,
            'last_name' => $lead->last_name,
            'company' => $company === '' ? null : $company,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'lead_id' => $lead->id,
            'last_contacted_at' => $lead->last_contacted_at,
            'created_by' => $by?->id,
        ]);

        $lead->notes()->create(['body' => "Propriétaire ajouté à l'annuaire : {$owner->fullName()}.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('owners', ['id' => $owner->id, 'lead_id' => $lead->id], "a ajouté {$owner->fullName()} à l'annuaire des propriétaires", $by));

        return $owner;
    }
}
