<?php

declare(strict_types=1);

use App\Actions\Dashboard\BuildMyWork;
use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the dashboard lists my assigned leads, owner leads and client files, sorted by what needs attention', function (): void {
    $me = User::factory()->create();
    $other = User::factory()->create();
    $recontact = Lead::factory()->create(['assigned_to' => $me->id, 'first_name' => 'Ana', 'last_name' => 'Silva', 'recontact_at' => '2026-09-10', 'last_contacted_at' => now()]);
    $stale = Lead::factory()->create(['assigned_to' => $me->id, 'first_name' => 'Léa', 'last_name' => 'Durand', 'recontact_at' => null, 'last_contacted_at' => now()->subDays(9)]);
    $fresh = Lead::factory()->create(['assigned_to' => $me->id, 'first_name' => 'Marc', 'last_name' => 'Petit', 'recontact_at' => null, 'last_contacted_at' => now()]);
    $owner = Lead::factory()->rentalManagement()->create(['assigned_to' => $me->id, 'first_name' => 'Paul', 'last_name' => 'Roux']);
    $client = Lead::factory()->converted()->create(['assigned_to' => $me->id, 'first_name' => 'Zoé', 'last_name' => 'Martin']);
    Lead::factory()->status(LeadStatus::Archived)->create(['assigned_to' => $me->id]);
    Lead::factory()->create(['assigned_to' => $other->id]);
    Lead::factory()->create(['assigned_to' => null]);

    $this->actingAs($me)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('dashboard')
            ->where('mine.leads.total', 3)
            ->where('mine.leads.items.0.uuid', $recontact->uuid)
            ->where('mine.leads.items.1.uuid', $stale->uuid)
            ->where('mine.leads.items.2.uuid', $fresh->uuid)
            ->where('mine.owner_leads.total', 1)
            ->where('mine.owner_leads.items.0.uuid', $owner->uuid)
            ->where('mine.owner_leads.items.0.status_label', 'À traiter')
            ->where('mine.clients.total', 1)
            ->where('mine.clients.items.0.uuid', $client->uuid)
            ->where('realtimeOnly', ['mine']));
});

test('a block is absent when the member cannot read its section, and each block is capped', function (): void {
    $me = User::factory()->create(['permissions' => ['leads' => 'none', 'clients' => 'none']]);
    Lead::factory()->count(BuildMyWork::LIMIT + 2)->rentalManagement()->create(['assigned_to' => $me->id]);
    Lead::factory()->create(['assigned_to' => $me->id]);

    $mine = (new BuildMyWork)->handle($me);

    expect($mine['leads'])->toBeNull()
        ->and($mine['clients'])->toBeNull()
        ->and($mine['owner_leads']['total'])->toBe(BuildMyWork::LIMIT + 2)
        ->and($mine['owner_leads']['items'])->toHaveCount(BuildMyWork::LIMIT);
});
