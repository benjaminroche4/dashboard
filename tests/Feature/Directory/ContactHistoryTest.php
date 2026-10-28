<?php

declare(strict_types=1);

use App\Actions\Directory\ListContactHistory;
use App\Models\Activity;
use App\Models\Agent;
use App\Models\Owner;
use App\Models\Partner;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('every exchange noted on an agent is kept in the history, dated by the exchange, most recent first', function (): void {
    $member = User::factory()->create(['name' => 'Charles Dupont']);
    $other = User::factory()->create(['name' => 'Admin Deux']);
    $agent = Agent::factory()->create(['first_name' => 'Marthe', 'last_name' => 'Dupuy']);

    // Un échange du jour, puis un échange daté après coup, plus ancien.
    $this->actingAs($member)->post(route('agents.touch', $agent))->assertRedirect();
    $this->actingAs($other)->post(route('agents.touch', $agent), ['at' => '2026-09-01'])->assertRedirect();

    $contacts = resolve(ListContactHistory::class)->handle($agent->refresh());

    expect($contacts)->toHaveCount(2)
        ->and($contacts[0]['by']['name'] ?? null)->toBe('Charles Dupont')
        ->and($contacts[1]['by']['name'] ?? null)->toBe('Admin Deux')
        ->and($contacts[1]['at'])->toStartWith('2026-09-01')
        // La date de l'échange n'est pas celle de la saisie.
        ->and($contacts[1]['noted_at'])->not->toStartWith('2026-09-01');

    // La fiche expose la liste pour la modale « Voir l'historique ».
    $this->actingAs($member)->get(route('agents.show', $agent))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('contacts', 2)
            ->where('contacts.0.by.name', 'Charles Dupont'));
});

test('the history ignores the other actions on the fiche but keeps the exchanges noted before the payload was tagged', function (): void {
    $member = User::factory()->create();
    $agent = Agent::factory()->create(['first_name' => 'Marthe', 'last_name' => 'Dupuy']);

    // Une entrée d'avant le marquage du payload : reconnue par son message.
    Activity::factory()->create([
        'resource' => 'agents',
        'message' => 'a noté un échange avec Marthe Dupuy',
        'agent_id' => $agent->id,
        'user_id' => $member->id,
        'payload' => ['id' => $agent->id],
        'created_at' => '2026-08-10 10:00:00',
    ]);
    // Une autre action sur la fiche, qui n'est pas un échange.
    Activity::factory()->create([
        'resource' => 'agents',
        'message' => 'a modifié le téléphone de l\'agent Marthe Dupuy',
        'agent_id' => $agent->id,
        'user_id' => $member->id,
        'payload' => ['id' => $agent->id],
    ]);

    $contacts = resolve(ListContactHistory::class)->handle($agent);

    expect($contacts)->toHaveCount(1)
        ->and($contacts[0]['at'])->toStartWith('2026-08-10');
});

test('partners and owners carry the same history on their fiche', function (): void {
    $member = User::factory()->create();
    $partner = Partner::factory()->create();
    $owner = Owner::factory()->create();

    $this->actingAs($member)->post(route('partners.contact', $partner))->assertRedirect();
    $this->actingAs($member)->post(route('owners.contact', $owner), ['at' => '2026-07-01'])->assertRedirect();

    $this->actingAs($member)->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('contacts', 1));
    $this->actingAs($member)->get(route('owners.show', $owner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('contacts', 1)
            ->where('contacts.0.at', fn (string $at): bool => str_starts_with($at, '2026-07-01')));
});
