<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Enums\TenantSlot;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Retire la seconde personne du lead : son identité (`co_*`) et sa fiche
 * (`tenant_profiles.co`). Sans seconde personne, rien n'est écrit.
 */
final class RemoveLeadCoTenant
{
    public function handle(Lead $lead, ?User $by = null): Lead
    {
        $name = $lead->coFullName();
        $profiles = $lead->tenant_profiles ?? [];

        if ($name === null && ! isset($profiles[TenantSlot::Co->value])) {
            return $lead;
        }

        unset($profiles[TenantSlot::Co->value]);

        $lead->forceFill([
            'co_first_name' => null,
            'co_last_name' => null,
            'co_email' => null,
            'co_phone' => null,
            'tenant_profiles' => $profiles === [] ? null : $profiles,
        ])->save();

        $who = $name ?? 'la seconde personne';
        event(new DashboardUpdated('leads', ['id' => $lead->id], "a retiré {$who} du lead {$lead->fullName()}", $by));

        return $lead;
    }
}
