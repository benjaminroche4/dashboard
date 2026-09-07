<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Data\PartnerData;
use App\Events\DashboardUpdated;
use App\Models\Partner;

/**
 * Modifie un partenaire.
 */
final class UpdatePartner
{
    public function handle(Partner $partner, PartnerData $data): Partner
    {
        $partner->fill($data->toArray())->save();

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a modifié le partenaire {$partner->name}"));

        return $partner;
    }
}
