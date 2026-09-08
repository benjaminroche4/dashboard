<?php

declare(strict_types=1);

use App\Actions\RealEstate\ToggleFavorite;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('toggling adds then removes a personal favorite on an agent', function (): void {
    $user = User::factory()->create();
    $agent = Agent::factory()->create();
    $toggle = new ToggleFavorite;

    expect($toggle->handle($user, $agent))->toBeTrue()
        ->and($agent->isFavoriteOf($user))->toBeTrue()
        ->and($user->favorites()->count())->toBe(1);

    expect($toggle->handle($user, $agent))->toBeFalse()
        ->and($agent->isFavoriteOf($user))->toBeFalse()
        ->and($user->favorites()->count())->toBe(0);
});

test('a favorite belongs to one member only and works for agencies too', function (): void {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $agency = Agency::factory()->create();

    (new ToggleFavorite)->handle($user, $agency);

    expect($agency->isFavoriteOf($user))->toBeTrue()
        ->and($agency->isFavoriteOf($other))->toBeFalse()
        ->and($agency->favorites()->count())->toBe(1);
});

test('deleting the subject or the member removes the favorite', function (): void {
    $user = User::factory()->create();
    $agent = Agent::factory()->create();
    $agency = Agency::factory()->create();
    (new ToggleFavorite)->handle($user, $agent);
    (new ToggleFavorite)->handle($user, $agency);

    $agent->delete();
    expect($user->favorites()->count())->toBe(1);

    $user->delete();
    expect($agency->favorites()->count())->toBe(0);
});
