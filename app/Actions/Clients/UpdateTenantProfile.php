<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Data\TenantProfileData;
use App\Enums\TenantSlot;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

/**
 * Enregistre les détails d'un locataire du dossier (état civil, titre de
 * séjour, situation professionnelle). Un emplacement vidé est effacé.
 */
final class UpdateTenantProfile
{
    public function handle(Lead $lead, TenantSlot $slot, TenantProfileData $data, ?User $by = null): Lead
    {
        $profiles = $lead->tenant_profiles ?? [];

        if ($data->isEmpty()) {
            unset($profiles[$slot->value]);
        } else {
            $profiles[$slot->value] = $data->toArray();
        }

        $lead->tenant_profiles = $profiles === [] ? null : $profiles;
        $lead->save();

        $name = $slot->name($lead);
        event(new DashboardUpdated('clients', ['id' => $lead->id, 'uuid' => $lead->uuid], "a mis à jour les informations de {$name}", $by));

        return $lead;
    }
}
