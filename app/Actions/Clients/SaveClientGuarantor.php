<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Data\LeadGuarantorData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadGuarantor;
use App\Models\User;

/**
 * Ajoute ou met à jour un garant du dossier : de simples informations de
 * contact, sans pièce à fournir.
 */
final class SaveClientGuarantor
{
    public function handle(Lead $lead, LeadGuarantorData $data, ?LeadGuarantor $guarantor = null, ?User $by = null): LeadGuarantor
    {
        $adding = ! $guarantor instanceof LeadGuarantor;

        if ($adding) {
            $guarantor = $lead->guarantorPeople()->create([
                ...$data->toArray(),
                'created_by' => $by?->id,
            ]);
        } else {
            $guarantor->fill($data->toArray())->save();
        }

        $lead->notes()->create([
            'body' => $adding
                ? "Garant ajouté au dossier : {$guarantor->fullName()}."
                : "Garant mis à jour : {$guarantor->fullName()}.",
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated(
            'clients',
            ['id' => $lead->id],
            $adding
                ? "a ajouté le garant {$guarantor->fullName()} au dossier {$lead->householdName()}"
                : "a mis à jour le garant {$guarantor->fullName()} du dossier {$lead->householdName()}",
            $by,
        ));

        return $guarantor;
    }
}
