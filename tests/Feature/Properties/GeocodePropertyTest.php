<?php

declare(strict_types=1);

use App\Actions\Properties\GeocodeProperty;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

function fakeGeocoding(float $lat = 48.8656, float $lng = 2.3705): void
{
    Http::fake(['maps.googleapis.com/maps/api/geocode/*' => Http::response([
        'status' => 'OK',
        'results' => [['geometry' => ['location' => ['lat' => $lat, 'lng' => $lng]]]],
    ])]);
}

test('the address of a property is built on one line for geocoding', function (): void {
    $property = Property::factory()->make(['street' => '12 rue Oberkampf', 'postal_code' => '75011', 'city' => 'Paris']);

    expect(GeocodeProperty::address($property))->toBe('12 rue Oberkampf, 75011 Paris, France');
    expect(GeocodeProperty::address(Property::factory()->make(['street' => '3 rue Oberkampf', 'postal_code' => null, 'city' => null])))
        ->toBe('3 rue Oberkampf, Paris, France');
});

test('without a server key the property stays unlocated and nothing is called', function (): void {
    config()->set('services.google.maps_key');
    Http::fake();

    $property = Property::factory()->create();

    expect(resolve(GeocodeProperty::class)->handle($property))->toBeFalse()
        ->and($property->fresh()->latitude)->toBeNull();
    Http::assertNothingSent();
});

test('a scheduled visit on a new property geocodes it, and the visits page exposes the coordinates', function (): void {
    config()->set('services.google.maps_key', 'server-key');
    fakeGeocoding();
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create();

    $this->actingAs($member)
        ->post(route('clients.visits.store'), [
            'lead_id' => $client->id,
            'scheduled_at' => '2026-09-15 10:30',
            'property' => ['street' => '12 rue Oberkampf', 'postal_code' => '75011', 'city' => 'Paris'],
        ])
        ->assertRedirect(route('clients.visits'));

    $property = Property::query()->firstOrFail();
    expect($property->latitude)->toBe(48.8656)->and($property->longitude)->toBe(2.3705);

    $this->actingAs($member)
        ->get(route('clients.visits'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('visits.0.property.latitude', 48.8656)
            ->where('visits.0.property.longitude', 2.3705));
});

test('a geocoding failure is logged and never breaks the request', function (): void {
    config()->set('services.google.maps_key', 'server-key');
    Http::fake(['maps.googleapis.com/*' => Http::response(['status' => 'REQUEST_DENIED', 'error_message' => 'Clé invalide'])]);
    Log::shouldReceive('warning')->once()->withArgs(fn (string $message): bool => str_contains($message, 'Géocodage'));

    $property = Property::factory()->create();

    expect(resolve(GeocodeProperty::class)->handle($property))->toBeFalse()
        ->and($property->fresh()->latitude)->toBeNull();
});

test('the properties:geocode command locates the properties without coordinates', function (): void {
    config()->set('services.google.maps_key', 'server-key');
    fakeGeocoding();
    Property::factory()->create(['latitude' => 48.85, 'longitude' => 2.35]);
    Property::factory()->count(2)->create();

    $this->artisan('properties:geocode')
        ->expectsOutput('2 bien(s) positionné(s) sur 2.')
        ->assertSuccessful();

    expect(Property::query()->whereNull('latitude')->count())->toBe(0);
    Http::assertSentCount(2);
});

test('a visit summary keeps null coordinates for an unlocated property', function (): void {
    $client = Lead::factory()->converted()->create();
    $property = Property::factory()->create();
    Visit::factory()->create(['lead_id' => $client->id, 'property_id' => $property->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('visits.0.property.latitude', null)
            ->where('visits.0.property.longitude', null));
});
