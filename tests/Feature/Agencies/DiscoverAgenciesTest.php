<?php

declare(strict_types=1);

use App\Models\Agency;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

function placesFake(): void
{
    Http::preventStrayRequests();
    Http::fake([
        'https://maps.googleapis.com/maps/api/place/textsearch/json*' => Http::response([
            'status' => 'OK',
            'results' => [
                ['place_id' => 'known-place', 'name' => 'Déjà Connue', 'formatted_address' => '1 rue X, 75011 Paris, France', 'rating' => 4.9, 'user_ratings_total' => 80, 'geometry' => ['location' => ['lat' => 48.86, 'lng' => 2.37]], 'business_status' => 'OPERATIONAL'],
                ['place_id' => 'new-place', 'name' => 'Nouvelle Agence', 'formatted_address' => '2 rue Y, 75011 Paris, France', 'rating' => 4.5, 'user_ratings_total' => 40, 'geometry' => ['location' => ['lat' => 48.861, 'lng' => 2.371]], 'business_status' => 'OPERATIONAL'],
                ['place_id' => 'same-name', 'name' => 'Par Son Nom', 'formatted_address' => '3 rue Z, 75011 Paris, France', 'rating' => 4.0, 'user_ratings_total' => 3, 'geometry' => ['location' => ['lat' => 48.862, 'lng' => 2.372]], 'business_status' => 'OPERATIONAL'],
                ['place_id' => 'closed', 'name' => 'Fermée', 'formatted_address' => '4 rue W, 75011 Paris, France', 'rating' => 5.0, 'user_ratings_total' => 500, 'business_status' => 'CLOSED_PERMANENTLY'],
            ],
        ]),
        'https://maps.googleapis.com/maps/api/place/details/json*' => Http::response([
            'status' => 'OK',
            'result' => [
                'name' => 'Nouvelle Agence',
                'international_phone_number' => '+33 1 40 00 00 00',
                'website' => 'https://nouvelle.example',
                'geometry' => ['location' => ['lat' => 48.861, 'lng' => 2.371]],
                'address_components' => [
                    ['types' => ['street_number'], 'long_name' => '2', 'short_name' => '2'],
                    ['types' => ['route'], 'long_name' => 'rue Y', 'short_name' => 'rue Y'],
                    ['types' => ['postal_code'], 'long_name' => '75011', 'short_name' => '75011'],
                    ['types' => ['locality'], 'long_name' => 'Paris', 'short_name' => 'Paris'],
                    ['types' => ['country'], 'long_name' => 'France', 'short_name' => 'FR'],
                ],
            ],
        ]),
        'https://maps.googleapis.com/maps/api/geocode/json*' => Http::response(['status' => 'ZERO_RESULTS', 'results' => []]),
    ]);
}

test('agencies of the target districts are found on Google, the known ones flagged, and one is added to the directory from its place', function (): void {
    Cache::flush();
    config()->set('services.google.maps_key', 'server-key');
    placesFake();
    $known = Agency::factory()->create(['name' => 'Déjà Connue', 'google_place_id' => 'known-place']);
    $byName = Agency::factory()->create(['name' => 'par son nom', 'postal_code' => '75011']);
    $client = Lead::factory()->converted()->create(['districts' => [11]]);
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson(route('clients.agencies.discover', $client))->assertOk();
    $rows = collect($response->json('agencies'));

    expect($rows->pluck('id')->all())->toBe(['known-place', 'new-place', 'same-name'])
        ->and($rows->firstWhere('id', 'known-place')['known_uuid'])->toBe($known->uuid)
        ->and($rows->firstWhere('id', 'same-name')['known_uuid'])->toBe($byName->uuid)
        ->and($rows->firstWhere('id', 'new-place')['known_uuid'])->toBeNull()
        ->and($rows->firstWhere('id', 'new-place')['district'])->toBe(11);

    $this->actingAs($user)->post(route('clients.agencies.from-place', $client), ['place_id' => 'new-place'])->assertRedirect();
    $added = Agency::query()->where('google_place_id', 'new-place')->first();
    expect($added)->not->toBeNull()
        ->and($added->name)->toBe('Nouvelle Agence')
        ->and($added->street)->toBe('2 rue Y')
        ->and($added->postal_code)->toBe('75011')
        ->and($added->phone)->toBe('+33 1 40 00 00 00')
        ->and($added->website)->toBe('https://nouvelle.example')
        ->and($added->latitude)->toBe(48.861)
        ->and($added->districts)->toBe([11]);

    // Le même lieu une seconde fois : pas de doublon.
    $this->actingAs($user)->post(route('clients.agencies.from-place', $client), ['place_id' => 'new-place'])->assertRedirect();
    expect(Agency::query()->where('google_place_id', 'new-place')->count())->toBe(1);
});

test('without districts on the dossier or without a Google key, the discovery answers 422', function (): void {
    Cache::flush();
    $user = User::factory()->create();
    $blank = Lead::factory()->converted()->create(['districts' => []]);
    $this->actingAs($user)->postJson(route('clients.agencies.discover', $blank))->assertStatus(422);

    config()->set('services.google.maps_key');
    $client = Lead::factory()->converted()->create(['districts' => [11]]);
    $this->actingAs($user)->postJson(route('clients.agencies.discover', $client))->assertStatus(422)
        ->assertJsonPath('message', 'Google Places non configuré (GOOGLE_MAPS_API_KEY).');
});
