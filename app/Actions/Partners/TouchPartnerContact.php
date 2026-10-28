<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Actions\Directory\ListContactHistory;
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
        $at ??= CarbonImmutable::now();
        $partner->last_contacted_at = $at;
        $partner->save();

        // Le payload marque l'échange et sa date : la modale « Voir
        // l'historique » des fiches relit le journal pour les lister.
        event(new DashboardUpdated('partners', ['id' => $partner->id, 'kind' => ListContactHistory::KIND, 'at' => $at->toIso8601String()], "a noté un échange avec {$partner->name}", $by));

        return $partner;
    }
}
