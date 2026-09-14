<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;

it('names the followers of the lead an event touches, so only they get a toast', function (): void {
    $advisor = User::factory()->staff()->create();
    $second = User::factory()->staff()->create();
    $lead = Lead::factory()->create(['assigned_to' => $advisor->id, 'co_assigned_to' => $second->id]);

    expect((new DashboardUpdated('leads', ['id' => $lead->id], 'a modifié le lead'))->broadcastWith()['concerns'])
        ->toBe([$advisor->id, $second->id])
        ->and((new DashboardUpdated('visits', ['id' => 99, 'lead_id' => $lead->id], 'a planifié'))->concerns())
        ->toBe([$advisor->id, $second->id])
        // Sans lead dans le payload, l'événement ne concerne personne en particulier.
        ->and((new DashboardUpdated('agencies', ['id' => 1], 'a ajouté une agence'))->concerns())
        ->toBe([]);
});
