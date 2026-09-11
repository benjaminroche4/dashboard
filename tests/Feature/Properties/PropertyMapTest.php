<?php

declare(strict_types=1);

use App\Models\Property;
use App\Models\User;

test('the map lists every property that can be placed, whatever the page', function (): void {
    $user = User::factory()->staff()->create();
    // Situable par ses coordonnées.
    $located = Property::factory()->located()->create(['title' => 'T2 lumineux · 11e']);
    // Situable par son arrondissement seul.
    $byDistrict = Property::factory()->create(['latitude' => null, 'longitude' => null, 'postal_code' => '75011', 'district' => 11]);
    // Ni coordonnées ni arrondissement : hors carte.
    Property::factory()->create(['latitude' => null, 'longitude' => null, 'postal_code' => null, 'district' => null, 'city' => 'Lyon']);

    $response = $this->actingAs($user)->getJson(route('properties.map'));

    $response->assertOk();
    $uuids = array_column($response->json(), 'uuid');
    expect($uuids)->toContain($located->uuid, $byDistrict->uuid)
        ->and($uuids)->toHaveCount(2);

    $first = collect($response->json())->firstWhere('uuid', $located->uuid);
    expect($first['label'])->toBe('T2 lumineux · 11e')
        ->and($first['latitude'])->not->toBeNull()
        ->and($first)->toHaveKeys(['status', 'status_label', 'rent_cents', 'currency', 'district']);
});

test('the map is closed to a member without access to the properties', function (): void {
    $this->getJson(route('properties.map'))->assertUnauthorized();
});
