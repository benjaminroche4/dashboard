<?php

declare(strict_types=1);

use App\Services\Geocoder;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

test('the geocoder is configured only with a key', function (): void {
    expect((new Geocoder(null))->isConfigured())->toBeFalse()
        ->and((new Geocoder(''))->isConfigured())->toBeFalse()
        ->and((new Geocoder('server-key'))->isConfigured())->toBeTrue();
});

test('the geocoder returns the first location of a found address', function (): void {
    Http::fake(['maps.googleapis.com/*' => Http::response([
        'status' => 'OK',
        'results' => [['geometry' => ['location' => ['lat' => 48.8656, 'lng' => 2.3705]]]],
    ])]);

    $location = (new Geocoder('server-key'))->geocode('12 rue Oberkampf, 75011 Paris, France');

    expect($location)->toBe(['lat' => 48.8656, 'lng' => 2.3705]);
    Http::assertSent(fn ($request): bool => $request['address'] === '12 rue Oberkampf, 75011 Paris, France'
        && $request['key'] === 'server-key'
        && $request['region'] === 'fr');
});

test('the geocoder returns null for an unknown address and throws on an API error', function (): void {
    Http::fake([
        'maps.googleapis.com/*' => Http::sequence()
            ->push(['status' => 'ZERO_RESULTS', 'results' => []])
            ->push(['status' => 'REQUEST_DENIED', 'error_message' => 'Clé invalide']),
    ]);
    $geocoder = new Geocoder('server-key');

    expect($geocoder->geocode('nulle part'))->toBeNull();
    expect(fn (): ?array => $geocoder->geocode('12 rue Oberkampf'))->toThrow(RuntimeException::class, 'REQUEST_DENIED');
});
