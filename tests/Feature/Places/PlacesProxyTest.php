<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    config()->set('services.google.maps_key', 'server-key');
});

test('guests cannot use the places proxy', function (): void {
    $this->getJson(route('places.suggest', ['input' => 'Rue des']))->assertUnauthorized();
});

test('it proxies suggestions to Google with the server key, regions and session', function (): void {
    Http::fake([
        'maps.googleapis.com/maps/api/place/autocomplete/*' => Http::response([
            'status' => 'OK',
            'predictions' => [[
                'place_id' => 'p1',
                'description' => 'Rue des Alpes 5, Genève, Suisse',
                'structured_formatting' => ['main_text' => 'Rue des Alpes 5', 'secondary_text' => 'Genève, Suisse'],
            ]],
        ]),
    ]);

    $this->actingAs(User::factory()->create())
        ->getJson(route('places.suggest', ['input' => 'Rue des', 'regions' => ['ch', 'fr'], 'session' => 'abc']))
        ->assertOk()
        ->assertJson(['suggestions' => [['id' => 'p1', 'main' => 'Rue des Alpes 5', 'secondary' => 'Genève, Suisse']]]);

    Http::assertSent(fn ($request): bool => str_contains($request->url(), 'key=server-key')
        && str_contains($request->url(), 'sessiontoken=abc')
        && str_contains(urldecode($request->url()), 'country:ch|country:fr'));
});

test('it resolves a place into a structured address', function (): void {
    Http::fake([
        'maps.googleapis.com/maps/api/place/details/*' => Http::response([
            'status' => 'OK',
            'result' => ['address_components' => [
                ['types' => ['street_number'], 'long_name' => '5', 'short_name' => '5'],
                ['types' => ['route'], 'long_name' => 'Rue des Alpes', 'short_name' => 'Rue des Alpes'],
                ['types' => ['locality', 'political'], 'long_name' => 'Genève', 'short_name' => 'Genève'],
                ['types' => ['postal_code'], 'long_name' => '1201', 'short_name' => '1201'],
                ['types' => ['country', 'political'], 'long_name' => 'Suisse', 'short_name' => 'CH'],
            ]],
        ]),
    ]);

    $this->actingAs(User::factory()->create())
        ->getJson(route('places.details', ['place_id' => 'p1']))
        ->assertOk()
        ->assertJson(['address' => [
            'street' => '5 Rue des Alpes',
            'postalCode' => '1201',
            'city' => 'Genève',
            'countryCode' => 'CH',
            'countryName' => 'Suisse',
        ]]);
});

test('a missing key answers 503 and the feature flag is off', function (): void {
    config()->set('services.google.maps_key');

    $this->actingAs(User::factory()->create())
        ->getJson(route('places.suggest', ['input' => 'Rue des']))
        ->assertStatus(503);

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('features.addressAutocomplete', false));
});

test('inputs are validated', function (): void {
    $this->actingAs(User::factory()->create())
        ->getJson(route('places.suggest', ['input' => 'ab']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('input');
});
