<?php

declare(strict_types=1);

use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('a client file lists its linked properties with their visits, and the properties left to link', function (): void {
    $client = Lead::factory()->converted()->create();
    $linked = Property::factory()->create(['title' => 'T2 lumineux · 11e']);
    $other = Property::factory()->create(['title' => 'Studio · 5e']);
    $client->properties()->attach($linked->id);
    Visit::factory()->create(['lead_id' => $client->id, 'property_id' => $linked->id, 'scheduled_at' => '2026-09-20 10:00:00']);
    Visit::factory()->status(VisitStatus::Done)->create(['lead_id' => $client->id, 'property_id' => $linked->id]);
    Visit::factory()->create(['property_id' => $linked->id]); // un autre client

    $this->actingAs(User::factory()->create())
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('properties', 1)
            ->where('properties.0.label', 'T2 lumineux · 11e')
            ->where('properties.0.visits_count', 2)
            ->where('properties.0.next_visit_at', fn (string $at): bool => str_starts_with($at, '2026-09-20T10:00'))
            ->has('propertyOptions', 1)
            ->where('propertyOptions.0.id', $other->id));
});

test('a property is linked to a client file, noted and broadcast, then unlinked', function (): void {
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e']);

    $this->actingAs($member)
        ->post(route('clients.properties.store', $client), ['property_id' => 999])
        ->assertSessionHasErrors(['property_id']);

    $this->actingAs($member)
        ->post(route('clients.properties.store', $client), ['property_id' => $property->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($client->properties()->count())->toBe(1)
        ->and($client->notes()->latest()->value('body'))->toBe('Bien rattaché au dossier : T2 lumineux · 11e.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'clients' && str_contains((string) $event->message, 'Léa Durand'));

    // Un second rattachement du même bien ne duplique rien.
    $this->actingAs($member)->post(route('clients.properties.store', $client), ['property_id' => $property->id])->assertRedirect();
    expect($client->properties()->count())->toBe(1)->and($client->notes()->count())->toBe(1);

    $this->actingAs($member)
        ->delete(route('clients.properties.destroy', [$client, $property]))
        ->assertRedirect();

    expect($client->properties()->count())->toBe(0)
        ->and(Property::query()->count())->toBe(1);
});

test('properties are linked to client files only', function (): void {
    $lead = Lead::factory()->create();
    $property = Property::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('clients.properties.store', $lead), ['property_id' => $property->id])
        ->assertNotFound();
});

test('the visit page pre-selects the client and the property passed in the query', function (): void {
    $client = Lead::factory()->converted()->create();
    $property = Property::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits.create', ['client' => $client->uuid, 'property' => $property->uuid]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('defaultClientId', $client->id)
            ->where('defaultPropertyId', $property->id));
});
