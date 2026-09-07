<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Data\PartnerData;
use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\User;

/**
 * Enregistre un partenaire.
 */
final class CreatePartner
{
    public function handle(PartnerData $data, ?User $by = null): Partner
    {
        $partner = Partner::query()->create([...$data->toArray(), 'created_by' => $by?->id]);

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a ajouté le partenaire {$partner->name}"));

        return $partner;
    }
}
