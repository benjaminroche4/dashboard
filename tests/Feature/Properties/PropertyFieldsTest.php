<?php

declare(strict_types=1);

use App\Enums\Furnished;
use App\Enums\PropertyType;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Partner;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a field is edited in place and the name of the property follows', function (): void {
    $member = User::factory()->create();
    $property = Property::factory()->create([
        'street' => '12 rue Oberkampf',
        'district' => 11,
        'property_type' => PropertyType::T2,
        'furnished' => Furnished::Unfurnished,
        'surface_m2' => 40,
        'rent_cents' => 310_000,
    ]);

    $this->actingAs($member)
        ->from(route('properties.show', $property))
        ->patch(route('properties.fields', $property), ['surface_m2' => 42, 'bedrooms' => 1])
        ->assertRedirect(route('properties.show', $property))
        ->assertSessionHasNoErrors();

    $property->refresh();
    expect($property->surface_m2)->toBe(42)
        ->and($property->bedrooms)->toBe(1)
        ->and($property->title)->toBe('T2 · 42 m² · 11e');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'properties'
        && $event->message === 'a modifié la surface, les chambres du bien T2 · 42 m² · 11e');
});

test('an empty value clears the field, nothing unchanged is broadcast, bad values are refused', function (): void {
    $member = User::factory()->create();
    $property = Property::factory()->create(['notes' => 'Digicode 1234.', 'rooms' => 2]);

    $this->actingAs($member)
        ->patch(route('properties.fields', $property), ['notes' => '  '])
        ->assertSessionHasNoErrors();
    expect($property->fresh()->notes)->toBeNull();

    Event::fake([DashboardUpdated::class]);
    $this->actingAs($member)
        ->patch(route('properties.fields', $property), ['rooms' => 2])
        ->assertSessionHasNoErrors();
    Event::assertNotDispatched(DashboardUpdated::class);

    $this->actingAs($member)
        ->from(route('properties.show', $property))
        ->patch(route('properties.fields', $property), ['rooms' => 0, 'floor' => 'grenier'])
        ->assertSessionHasErrors(['rooms', 'floor']);

    $this->actingAs($member)
        ->patch("/properties/{$property->id}/fields", ['rooms' => 3])
        ->assertNotFound();
});

test('the contacts are set together, and an agent brings its agency', function (): void {
    $member = User::factory()->create();
    $property = Property::factory()->create(['owner_id' => null, 'agent_id' => null, 'partner_id' => null]);
    $owner = Owner::factory()->create();
    $agency = Agency::factory()->create();
    $agent = Agent::factory()->forAgency($agency)->create();
    $partner = Partner::factory()->create();

    $this->actingAs($member)
        ->patch(route('properties.fields', $property), [
            'owner_id' => $owner->id,
            'agent_id' => $agent->id,
            'partner_id' => $partner->id,
        ])
        ->assertSessionHasNoErrors();

    $property->refresh();
    expect($property->owner_id)->toBe($owner->id)
        ->and($property->agent_id)->toBe($agent->id)
        ->and($property->agency_id)->toBe($agency->id)
        ->and($property->partner_id)->toBe($partner->id);

    // Une autre agence : l'agent de la précédente n'y travaille pas, il part.
    $other = Agency::factory()->create();
    $this->actingAs($member)
        ->patch(route('properties.fields', $property), ['agency_id' => $other->id])
        ->assertSessionHasNoErrors();
    expect($property->fresh()->agent_id)->toBeNull()
        ->and($property->fresh()->agency_id)->toBe($other->id);

    // Un agent qui n'est pas de l'agence choisie est refusé.
    $this->actingAs($member)
        ->from(route('properties.show', $property))
        ->patch(route('properties.fields', $property), ['agency_id' => $other->id, 'agent_id' => $agent->id])
        ->assertSessionHasErrors('agent_id');
});

test('the page offers every client for the assignment, and assigning links the property to the file', function (): void {
    $member = User::factory()->create();
    $property = Property::factory()->create();
    $client = Lead::factory()->converted()->create();
    Lead::factory()->create();

    $this->actingAs($member)
        ->get(route('properties.show', $property))
        ->assertInertia(fn ($page) => $page
            ->has('clientOptions', 1)
            ->where('clientOptions.0.uuid', $client->uuid)
            ->where('agency', null));

    $this->actingAs($member)
        ->patch(route('properties.assign', $property), ['lead_id' => $client->id])
        ->assertSessionHasNoErrors();

    expect($client->properties()->whereKey($property->id)->exists())->toBeTrue();
});
