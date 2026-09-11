<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Note la date du dernier échange avec un partenaire, pour repérer ceux que
 * l'équipe n'a pas appelés depuis longtemps.
 */
final class TouchPartnerContact
{
    public function handle(Partner $partner, ?CarbonImmutable $at = null, ?User $by = null): Partner
    {
        $partner->last_contacted_at = $at ?? CarbonImmutable::now();
        $partner->save();

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a noté un échange avec {$partner->name}", $by));

        return $partner;
    }
}
