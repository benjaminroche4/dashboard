<?php

declare(strict_types=1);

use App\Models\Agency;
use App\Models\Agent;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;

/** Google répond toujours la même position pendant ces tests. */
function fakeGeocoder(float $lat = 48.8656, float $lng = 2.3705): void
{
    config()->set('services.google.maps_key', 'server-key');

    Http::fake(['maps.googleapis.com/*' => Http::response([
        'status' => 'OK',
        'results' => [['geometry' => ['location' => ['lat' => $lat, 'lng' => $lng]]]],
    ])]);
}

test('an agency, an agent and a partner are placed on the map from their address', function (): void {
    fakeGeocoder();
    $staff = User::factory()->create();

    $this->actingAs($staff)->post(route('agencies.store'), [
        'name' => 'Paris Ouest Immobilier',
        'street' => '12 rue Oberkampf',
        'postal_code' => '75011',
        'city' => 'Paris',
    ])->assertSessionHasNoErrors();

    $this->actingAs($staff)->post(route('agents.store'), [
        'first_name' => 'Camille',
        'last_name' => 'Roux',
        'street' => '3 rue des Martyrs',
        'postal_code' => '75009',
        'city' => 'Paris',
    ])->assertSessionHasNoErrors();

    $this->actingAs($staff)->post(route('partners.store'), [
        'name' => 'Zen Gestion',
        'type' => 'management',
        'street' => '5 rue de Bretagne',
        'postal_code' => '75003',
        'city' => 'Paris',
    ])->assertSessionHasNoErrors();

    expect(Agency::query()->firstOrFail()->latitude)->toBe(48.8656)
        ->and(Agent::query()->firstOrFail()->longitude)->toBe(2.3705)
        ->and(Partner::query()->firstOrFail()->latitude)->toBe(48.8656);

    // L'adresse envoyée à Google est complète et française.
    Http::assertSent(fn ($request): bool => str_contains((string) $request['address'], 'France'));

    // La fiche expose la position pour la modale « Voir sur la carte ».
    $this->actingAs($staff)->get(route('partners.show', Partner::query()->firstOrFail()))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('partner.latitude', 48.8656)
            ->where('partner.longitude', 2.3705));
});

test('a new address moves the entry, and a partner without street is never geocoded', function (): void {
    fakeGeocoder();
    $staff = User::factory()->create();
    $partner = Partner::factory()->create(['street' => '5 rue de Bretagne', 'postal_code' => '75003', 'city' => 'Paris', 'latitude' => 48.8, 'longitude' => 2.3]);

    $this->actingAs($staff)->patch(route('partners.update', $partner), [
        'name' => $partner->name,
        'type' => $partner->type->value,
        'street' => '10 avenue de l’Opéra',
        'postal_code' => '75001',
        'city' => 'Paris',
    ])->assertSessionHasNoErrors();

    expect($partner->refresh()->latitude)->toBe(48.8656);

    Http::fake();
    $this->actingAs($staff)->post(route('partners.store'), ['name' => 'Sans adresse', 'type' => 'other'])
        ->assertSessionHasNoErrors();

    expect(Partner::query()->where('name', 'Sans adresse')->firstOrFail()->latitude)->toBeNull();
    Http::assertNothingSent();
});

test('the directory geocoding command catches up the entries without coordinates', function (): void {
    fakeGeocoder();
    Agency::factory()->create(['street' => '12 rue Oberkampf', 'latitude' => null]);
    Agent::factory()->create(['street' => null, 'latitude' => null]);

    $this->artisan('directory:geocode')
        ->expectsOutputToContain('positionnée(s)')
        ->assertSuccessful();

    expect(Agency::query()->firstOrFail()->latitude)->toBe(48.8656)
        // Sans rue, rien à géocoder.
        ->and(Agent::query()->firstOrFail()->latitude)->toBeNull();
});
