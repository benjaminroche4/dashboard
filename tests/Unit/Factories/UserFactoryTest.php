<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('the staff state sets a known password', function (): void {
    $user = User::factory()->staff('my-pass')->create();

    expect(Hash::check('my-pass', $user->password))->toBeTrue();
});

test('the two-factor state configures a confirmed secret', function (): void {
    $user = User::factory()->withTwoFactor()->create();

    expect($user->two_factor_confirmed_at)->not->toBeNull()
        ->and($user->two_factor_secret)->not->toBeNull();
});

test('the role states set the role', function (): void {
    expect(User::factory()->create()->role)->toBe(StaffRole::Member)
        ->and(User::factory()->admin()->create()->role)->toBe(StaffRole::Admin)
        ->and(User::factory()->manager()->create()->role)->toBe(StaffRole::Manager);
});
