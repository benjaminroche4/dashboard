<?php

declare(strict_types=1);

use App\Enums\PropertyStatus;
use App\Enums\PropertyType;
use App\Events\DashboardUpdated;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the properties page lists every property with its agent, visits count and the form options', function (): void {
    $this->get(route('properties.index'))->assertRedirect(route('login'));

    $author = User::factory()->create(['name' => 'Admin']);
    $agent = Agent::factory()->create(['first_name' => 'Zoé', 'last_name' => 'Martin']);
    $property = Property::factory()->create(['title' => null, 'street' => '8 rue de Rivoli', 'postal_code' => '75004', 'agent_id' => $agent->id, 'created_by' => $author->id, 'created_at' => now()->subDay()]);
    Visit::factory()->count(2)->create(['property_id' => $property->id]);
    Property::factory()->create(['title' => 'T2 lumineux · 11e', 'created_at' => now()]);

    $this->actingAs($author)
        ->get(route('properties.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/index')
            ->has('properties', 2)
            ->where('properties.0.label', 'T2 lumineux · 11e')
            ->where('properties.1.label', '8 rue de Rivoli')
            ->where('properties.1.agent.name', 'Zoé Martin')
            ->where('properties.1.visits_count', 2)
            ->where('properties.1.creator', 'Admin')
            ->has('propertyTypes', count(PropertyType::cases()))
            ->has('agents', 1)
            ->where('realtimeOnly', ['properties']));
});

test('any member adds and updates a property, the district being derived from the postal code', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('properties.index'))
        ->post(route('properties.store'), ['street' => '', 'listing_url' => 'pas-une-url'])
        ->assertSessionHasErrors(['street', 'listing_url']);

    $this->actingAs($member)
        ->from(route('properties.index'))
        ->post(route('properties.store'), [
            'street' => '5 rue de Bretagne',
            'postal_code' => '75003',
            'city' => 'Paris',
            'property_type' => 't2',
            'furnished' => 'furnished',
            'rent_cents' => 180_000,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('properties.show', Property::query()->sole()));

    $property = Property::query()->sole();
    expect($property->district)->toBe(3)
        ->and($property->property_type)->toBe(PropertyType::T2)
        ->and($property->created_by)->toBe($member->id)
        ->and($property->label())->toBe('5 rue de Bretagne');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'properties' && str_contains((string) $event->message, '5 rue de Bretagne'));

    $this->actingAs($member)
        ->patch(route('properties.update', $property), ['title' => 'Joli T2', 'street' => '5 rue de Bretagne', 'district' => 4])
        ->assertRedirect(route('properties.show', $property));

    expect($property->refresh()->label())->toBe('Joli T2')
        ->and($property->district)->toBe(4);
});

test('adding and editing a property are dedicated pages, addressed by uuid', function (): void {
    $this->get(route('properties.create'))->assertRedirect(route('login'));

    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e']);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->get(route('properties.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/edit')
            ->where('property', null)
            ->has('propertyTypes')
            ->has('agents'));

    $this->actingAs($member)
        ->get(route('properties.edit', $property))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/edit')
            ->where('property.uuid', $property->uuid)
            ->where('property.label', 'T2 lumineux · 11e')
            ->has('owners'));

    $this->actingAs($member)->get("/properties/{$property->id}/edit")->assertNotFound();
});

test('only admins delete a property, which removes its visits', function (): void {
    $property = Property::factory()->create();
    Visit::factory()->create(['property_id' => $property->id]);

    $this->actingAs(User::factory()->create())->delete(route('properties.destroy', $property))->assertForbidden();
    $this->actingAs(User::factory()->admin()->create())->delete(route('properties.destroy', $property))->assertRedirect();

    expect(Property::query()->count())->toBe(0)
        ->and(Visit::query()->count())->toBe(0);
});

test('property routes use the uuid and refuse the numeric id', function (): void {
    $property = Property::factory()->create();
    $admin = User::factory()->admin()->create();

    expect(Str::isUuid($property->uuid))->toBeTrue()
        ->and(route('properties.update', $property))->toEndWith('/properties/'.$property->uuid);

    $this->actingAs($admin)->patch('/properties/'.$property->id, ['street' => 'X'])->assertNotFound();
    $this->actingAs($admin)->delete('/properties/'.$property->id)->assertNotFound();
});

test('a property has a detail page with its owner, visits and the form options, addressed by uuid', function (): void {
    $owner = Owner::factory()->create(['first_name' => 'Ali', 'last_name' => 'Bensaïd']);
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e', 'owner_id' => $owner->id]);
    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    Visit::factory()->create(['property_id' => $property->id, 'lead_id' => $lead->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('properties.show', $property))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('properties/show')
            ->where('property.label', 'T2 lumineux · 11e')
            ->where('property.visits_count', 1)
            ->where('owner.name', 'Ali Bensaïd')
            ->has('visits', 1)
            ->where('visits.0.client.name', 'Léa Durand')
            ->has('propertyTypes'));

    $this->actingAs(User::factory()->create())->get("/properties/{$property->id}")->assertNotFound();
});

test('a property has an availability status, available by default, changed on update and listed in the form options', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)->post(route('properties.store'), ['street' => '9 rue Oberkampf'])->assertSessionHasNoErrors();
    $property = Property::query()->firstOrFail();
    expect($property->status)->toBe(PropertyStatus::Available)->and($property->status->isOpen())->toBeTrue();

    $this->actingAs($member)->patch(route('properties.update', $property), ['street' => '9 rue Oberkampf', 'status' => 'unavailable'])->assertSessionHasNoErrors();
    expect($property->refresh()->status)->toBe(PropertyStatus::Unavailable)->and($property->status->isOpen())->toBeFalse();

    $this->actingAs($member)->patch(route('properties.update', $property), ['street' => '9 rue Oberkampf', 'status' => 'nope'])->assertSessionHasErrors('status');

    $this->actingAs($member)
        ->get(route('properties.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('properties.0.status', 'unavailable')
            ->where('properties.0.status_label', 'Non disponible')
            ->has('propertyStatuses', count(PropertyStatus::cases())));
});
