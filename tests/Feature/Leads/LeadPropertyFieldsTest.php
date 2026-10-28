<?php

declare(strict_types=1);

use App\Enums\Orientation;
use App\Enums\OwnerPropertyType;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadProperty;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    config(['services.google.maps_key' => 'test-key']);
    Http::fake([
        'maps.googleapis.com/maps/api/geocode/*' => Http::response([
            'status' => 'OK',
            'results' => [['geometry' => ['location' => ['lat' => 48.8556, 'lng' => 2.3600]]]],
        ]),
    ]);
});

function ownerLead(array $attributes = []): Lead
{
    return Lead::factory()->create(['first_name' => 'Paul', 'last_name' => 'Roux', 'help_type' => WebsiteHelpType::RentalManagement, ...$attributes]);
}

test('a property field is edited in place from the owner lead fiche, the others untouched', function (): void {
    $lead = ownerLead();
    LeadProperty::factory()->for($lead)->create(['surface' => 42, 'rent_cents' => 145_000, 'address' => null, 'latitude' => null]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.property.fields', $lead), ['surface' => 55])
        ->assertRedirect();

    $property = $lead->property()->sole();
    expect($property->surface)->toBe(55)
        ->and($property->rent_cents)->toBe(145_000);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a modifié la surface du bien proposé par Paul Roux');
});

test('the property is created at the first filled field and geocoded once it has an address', function (): void {
    $lead = ownerLead();
    expect($lead->property)->toBeNull();

    $user = User::factory()->create();
    $this->actingAs($user)
        ->patch(route('leads.property.fields', $lead), ['property_type' => OwnerPropertyType::T2->value])
        ->assertRedirect();

    $property = $lead->property()->sole();
    expect($property->property_type)->toBe(OwnerPropertyType::T2)
        ->and($property->latitude)->toBeNull();

    $this->actingAs($user)
        ->patch(route('leads.property.fields', $lead), ['address' => '12 rue de Rivoli, 75004 Paris', 'place_id' => 'ChIJ-rivoli'])
        ->assertRedirect();

    $property->refresh();
    expect($property->address)->toBe('12 rue de Rivoli, 75004 Paris')
        ->and($property->place_id)->toBe('ChIJ-rivoli')
        ->and($property->latitude)->toBe(48.8556)
        ->and($property->longitude)->toBe(2.36);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "a modifié l'adresse du bien proposé par Paul Roux");
});

test('lists are written, an empty value clears the field, an address typed without a suggestion drops the place, and nothing is broadcast without a change', function (): void {
    $lead = ownerLead();
    LeadProperty::factory()->for($lead)->create(['note' => 'Visites le samedi.', 'place_id' => 'ChIJ-old', 'address' => '1 rue A, 75001 Paris']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('leads.property.fields', $lead), ['orientations' => ['south', 'west'], 'note' => '', 'address' => '2 rue B, 75002 Paris'])
        ->assertRedirect();

    $property = $lead->property()->sole();
    expect($property->orientations?->map(fn (Orientation $orientation): string => $orientation->value)->all())->toBe(['south', 'west'])
        ->and($property->note)->toBeNull()
        ->and($property->place_id)->toBeNull();

    Event::fake([DashboardUpdated::class]);
    $this->actingAs($user)
        ->patch(route('leads.property.fields', $lead), ['orientations' => ['south', 'west']])
        ->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);
});

test('the route refuses an unknown value, a tenant lead, and a member who cannot edit leads', function (): void {
    $lead = ownerLead();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('leads.show', $lead))
        ->patch(route('leads.property.fields', $lead), ['bedrooms' => 9])
        ->assertSessionHasErrors('bedrooms');

    $tenant = Lead::factory()->create(['help_type' => WebsiteHelpType::HousingSearch]);
    $this->actingAs($user)
        ->patch(route('leads.property.fields', $tenant), ['surface' => 30])
        ->assertForbidden();

    $reader = User::factory()->create(['permissions' => ['leads' => 'read', 'owner_leads' => 'read']]);
    $this->actingAs($reader)
        ->patch(route('leads.property.fields', $lead), ['surface' => 30])
        ->assertForbidden();
});

test('the owner lead fiche always carries the property, empty or not, with its options and position', function (): void {
    $lead = ownerLead();

    $this->actingAs(User::factory()->create())
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('leads/show')
            ->where('property.address', null)
            ->where('property.latitude', null)
            ->where('property.orientations', [])
            ->has('propertyOptions.propertyTypes')
            ->has('propertyOptions.amenities'));

    $tenant = Lead::factory()->create(['help_type' => WebsiteHelpType::HousingSearch]);
    $this->actingAs(User::factory()->create())
        ->get(route('leads.show', $tenant))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('property', null)
            ->where('propertyOptions', null));
});
