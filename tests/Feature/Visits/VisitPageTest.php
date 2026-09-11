<?php

declare(strict_types=1);

use App\Models\Agent;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Inertia\Testing\AssertableInertia;

test('a visit has its own page, reached by its uuid', function (): void {
    $user = User::factory()->staff()->create();
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e', 'street' => '12 rue Oberkampf']);
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $visit = Visit::factory()->for($client, 'lead')->for($property)->create([
        'agent_id' => $agent->id,
        'assigned_to' => $user->id,
        'notes' => 'Code de la porte : 1234.',
    ]);
    // Une autre visite du même client, listée sur la fiche.
    Visit::factory()->for($client, 'lead')->for(Property::factory()->create())->create();

    $this->actingAs($user)
        ->get(route('clients.visits.show', $visit))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/visit')
            ->where('visit.uuid', $visit->uuid)
            ->where('visit.client.name', 'Léa Durand')
            ->where('visit.property.label', 'T2 lumineux · 11e')
            ->where('visit.property.street', '12 rue Oberkampf')
            ->where('visit.agent.name', 'Zoé Martin')
            ->where('visit.assignee.name', $user->name)
            ->where('visit.notes', 'Code de la porte : 1234.')
            ->has('otherVisits', 1));

    // L'identifiant numérique ne répond pas.
    $this->actingAs($user)->get('/clients/visits/'.$visit->id)->assertNotFound();
});

test('a visit is edited from its own form', function (): void {
    $user = User::factory()->staff()->create();
    $other = User::factory()->staff()->create();
    $agent = Agent::factory()->create();
    $visit = Visit::factory()->for(Lead::factory()->converted(), 'lead')->for(Property::factory())->create();
    $property = Property::factory()->create();

    $this->actingAs($user)
        ->get(route('clients.visits.edit', $visit))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/visit-edit')
            ->where('visit.uuid', $visit->uuid)
            ->has('clients')
            ->has('properties'));

    $this->actingAs($user)
        ->patch(route('clients.visits.update', $visit), [
            'scheduled_at' => '2026-10-01T09:30',
            'property_id' => $property->id,
            'agent_id' => $agent->id,
            'assigned_to' => $other->id,
            'notes' => 'Rendez-vous devant l’immeuble.',
        ])
        ->assertRedirect();

    $visit->refresh();
    expect($visit->property_id)->toBe($property->id)
        ->and($visit->agent_id)->toBe($agent->id)
        ->and($visit->assigned_to)->toBe($other->id)
        ->and($visit->notes)->toBe('Rendez-vous devant l’immeuble.')
        ->and($visit->scheduled_at->format('Y-m-d H:i'))->toBe('2026-10-01 09:30');
});

test('a visit keeps its agent when the update does not mention it', function (): void {
    $user = User::factory()->staff()->create();
    $agent = Agent::factory()->create();
    $visit = Visit::factory()->for(Lead::factory()->converted(), 'lead')->for(Property::factory())->create(['agent_id' => $agent->id]);

    $this->actingAs($user)
        ->patch(route('clients.visits.update', $visit), ['status' => 'done'])
        ->assertRedirect();

    expect($visit->refresh()->agent_id)->toBe($agent->id)
        ->and($visit->status->value)->toBe('done');
});
