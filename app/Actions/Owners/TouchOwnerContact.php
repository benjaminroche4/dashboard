<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Actions\Directory\ListContactHistory;
use App\Events\DashboardUpdated;
use App\Models\Owner;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Note la date du dernier échange avec un propriétaire, comme pour les agents
 * et les partenaires : sans elle, rien ne dit lequel n'a pas été rappelé.
 */
final class TouchOwnerContact
{
    public function handle(Owner $owner, ?CarbonImmutable $at = null, ?User $by = null): Owner
    {
        $at ??= CarbonImmutable::now();
        $owner->last_contacted_at = $at;
        $owner->save();

        // Le payload marque l'échange et sa date : la modale « Voir
        // l'historique » des fiches relit le journal pour les lister.
        event(new DashboardUpdated('owners', ['id' => $owner->id, 'kind' => ListContactHistory::KIND, 'at' => $at->toIso8601String()], "a noté un échange avec {$owner->fullName()}", $by));

        return $owner;
    }
}
