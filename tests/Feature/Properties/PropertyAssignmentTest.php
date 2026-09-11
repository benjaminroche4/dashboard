<?php

declare(strict_types=1);

use App\Enums\PropertyStatus;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('a property is assigned to a client, then released', function (): void {
    $user = User::factory()->staff()->create();
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e']);

    $this->actingAs($user)
        ->patch(route('properties.assign', $property), ['lead_id' => $client->id])
        ->assertRedirect();

    $property->refresh();
    expect($property->assigned_lead_id)->toBe($client->id)
        ->and($property->assigned_at)->not->toBeNull()
        ->and($property->isAssigned())->toBeTrue()
        // Le dossier garde la trace de l'attribution.
        ->and($client->notes()->latest('id')->first()?->body)->toContain('Bien attribué au dossier : T2 lumineux · 11e.');

    $this->actingAs($user)
        ->get(route('properties.show', $property))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('property.assigned_lead.name', 'Léa Durand')
            ->where('property.assigned_lead.uuid', $client->uuid));

    $this->actingAs($user)
        ->patch(route('properties.assign', $property), ['lead_id' => null])
        ->assertRedirect();

    expect($property->refresh()->assigned_lead_id)->toBeNull()
        ->and($property->assigned_at)->toBeNull()
        ->and($client->notes()->latest('id')->first()?->body)->toContain('Bien libéré');
});

test('a property can only be assigned to a converted lead', function (): void {
    $user = User::factory()->staff()->create();
    $property = Property::factory()->create();

    $this->actingAs($user)
        ->patch(route('properties.assign', $property), ['lead_id' => Lead::factory()->create()->id])
        ->assertSessionHasErrors('lead_id');

    expect($property->refresh()->assigned_lead_id)->toBeNull();
});

test('an assigned property is no longer offered for a visit, nor suggested', function (): void {
    $user = User::factory()->staff()->create();
    $client = Lead::factory()->converted()->create();
    $free = Property::factory()->create(['title' => 'Libre']);
    $taken = Property::factory()->create(['title' => 'Pris', 'assigned_lead_id' => $client->id, 'assigned_at' => now()]);

    // Formulaire « Planifier une visite » : seuls les biens libres sont proposés.
    $this->actingAs($user)
        ->get(route('clients.visits.create'))
        ->assertInertia(function (AssertableInertia $page) use ($free, $taken): void {
            $labels = array_column($page->toArray()['props']['properties'], 'label');
            expect($labels)->toContain($free->label())
                ->and($labels)->not->toContain($taken->label());
        });

    // Dossier : ni dans les biens à lier, ni dans les suggestions.
    $this->actingAs($user)
        ->get(route('clients.show', $client))
        ->assertInertia(function (AssertableInertia $page) use ($taken): void {
            $props = $page->toArray()['props'];
            expect(array_column($props['propertyOptions'], 'label'))->not->toContain($taken->label())
                ->and(array_column($props['suggestedProperties'], 'label'))->not->toContain($taken->label());
        });
});

test('assigning a property puts it under offer, releasing it makes it available again', function (): void {
    $user = User::factory()->staff()->create();
    $client = Lead::factory()->converted()->create();
    $property = Property::factory()->create(['status' => PropertyStatus::Available]);

    $this->actingAs($user)->patch(route('properties.assign', $property), ['lead_id' => $client->id]);
    expect($property->refresh()->status)->toBe(PropertyStatus::UnderOffer)
        ->and($property->isAvailable())->toBeFalse();

    $this->actingAs($user)->patch(route('properties.assign', $property), ['lead_id' => null]);
    expect($property->refresh()->status)->toBe(PropertyStatus::Available)
        ->and($property->isAvailable())->toBeTrue();
});

test('a rented property keeps its status through an assignment', function (): void {
    $user = User::factory()->staff()->create();
    $client = Lead::factory()->converted()->create();
    $property = Property::factory()->create(['status' => PropertyStatus::Rented]);

    $this->actingAs($user)->patch(route('properties.assign', $property), ['lead_id' => $client->id]);
    expect($property->refresh()->status)->toBe(PropertyStatus::Rented);

    $this->actingAs($user)->patch(route('properties.assign', $property), ['lead_id' => null]);
    expect($property->refresh()->status)->toBe(PropertyStatus::Rented);
});

test('the map says which properties are still available and to whom the others went', function (): void {
    $user = User::factory()->staff()->create();
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $free = Property::factory()->located()->create(['title' => 'Libre', 'status' => PropertyStatus::Available]);
    $taken = Property::factory()->located()->create(['title' => 'Pris', 'assigned_lead_id' => $client->id, 'assigned_at' => now()]);

    $points = collect($this->actingAs($user)->getJson(route('properties.map'))->assertOk()->json())
        ->keyBy('uuid');

    expect($points[$free->uuid]['is_available'])->toBeTrue()
        ->and($points[$free->uuid]['assigned_to'])->toBeNull()
        ->and($points[$taken->uuid]['is_available'])->toBeFalse()
        ->and($points[$taken->uuid]['assigned_to'])->toBe('Léa Durand');
});
